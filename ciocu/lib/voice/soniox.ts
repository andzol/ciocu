"use client";

// Soniox real-time STT for PAID users. Mirrors the Web Speech VoiceHandle shape so it drops into
// the same slot. Flow: mint a temp key from /api/stt-token (server checks identity + subscription;
// returns null-equivalent if denied) → capture mic as PCM16 → stream to Soniox over WebSocket →
// assemble finalized utterances at each "<end>" token → report processed audio ms for metering.
//
// createSonioxVoice() returns null when the user isn't entitled (or setup fails), so the caller
// can fall back to the free Web Speech path.

import type { VoiceHandle } from "./speech";

interface SonioxOptions {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
  onProcessedMs?: (deltaMs: number) => void;
}

interface Token {
  text: string;
  is_final?: boolean;
}
interface SonioxMessage {
  tokens?: Token[];
  total_audio_proc_ms?: number;
  finished?: boolean;
}
interface SttToken {
  apiKey: string;
  model: string;
  expiresAt: number;
}

const WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

// AudioWorklet: convert each Float32 mic frame to little-endian PCM16 and hand it back to the main
// thread (transferred, zero-copy) to push over the socket.
const WORKLET_SRC = `
class PCMWorklet extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      const buf = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++) {
        let s = ch[i];
        if (s > 1) s = 1; else if (s < -1) s = -1;
        buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(buf.buffer, [buf.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-worklet', PCMWorklet);
`;

let workletUrlCache: string | null = null;
function workletUrl(): string {
  if (!workletUrlCache) {
    workletUrlCache = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" }));
  }
  return workletUrlCache;
}

async function fetchToken(): Promise<SttToken | null> {
  try {
    const res = await fetch("/api/stt-token", { method: "POST" });
    if (!res.ok) return null; // 401 not signed in · 403 not subscribed · 5xx not configured
    const d = await res.json();
    if (!d?.apiKey) return null;
    return {
      apiKey: d.apiKey,
      model: d.model || "stt-rt-v5",
      expiresAt: Date.now() + (d.expiresInSeconds ?? 3600) * 1000,
    };
  } catch {
    return null;
  }
}

export async function createSonioxVoice(opts: SonioxOptions): Promise<VoiceHandle | null> {
  // Probe entitlement up front — no key means "not paid", so the caller uses Web Speech instead.
  let token = await fetchToken();
  if (!token) return null;

  let ws: WebSocket | null = null;
  let ctx: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let node: AudioWorkletNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let running = false;
  let wsReady = false;
  let finalBuf = "";
  let lastTotalMs = 0;

  function handleMessage(data: string | ArrayBuffer) {
    let msg: SonioxMessage;
    try {
      msg = JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data));
    } catch {
      return;
    }
    // meter the newly processed audio (Soniox reports cumulative ms)
    if (typeof msg.total_audio_proc_ms === "number" && msg.total_audio_proc_ms > lastTotalMs) {
      opts.onProcessedMs?.(msg.total_audio_proc_ms - lastTotalMs);
      lastTotalMs = msg.total_audio_proc_ms;
    }
    if (msg.tokens) {
      let interim = "";
      for (const t of msg.tokens) {
        if (t.text === "<end>") {
          const utter = finalBuf.trim();
          finalBuf = "";
          if (utter) opts.onFinal(utter);
        } else if (t.is_final) {
          finalBuf += t.text;
        } else {
          interim += t.text;
        }
      }
      if (interim) opts.onInterim?.((finalBuf + interim).trim());
    }
  }

  function cleanupMedia() {
    try { node?.disconnect(); } catch { /* noop */ }
    try { source?.disconnect(); } catch { /* noop */ }
    try { stream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { void ctx?.close(); } catch { /* noop */ }
    node = null;
    source = null;
    stream = null;
    ctx = null;
  }

  function end() {
    running = false;
    wsReady = false;
    try { if (ws && ws.readyState === WebSocket.OPEN) ws.send(""); } catch { /* noop */ }
    try { ws?.close(); } catch { /* noop */ }
    ws = null;
    cleanupMedia();
  }

  async function begin() {
    if (running) return;
    running = true;
    finalBuf = "";
    lastTotalMs = 0;

    // refresh the key if it's expiring
    if (!token || Date.now() > token.expiresAt - 30_000) {
      token = await fetchToken();
      if (!token || !running) {
        running = false;
        return;
      }
    }
    const tok = token;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      if (!running) {
        cleanupMedia();
        return;
      }
      const audioCtx = new AudioContext();
      ctx = audioCtx;
      await audioCtx.audioWorklet.addModule(workletUrl());
      if (!running) {
        cleanupMedia();
        return;
      }
      source = audioCtx.createMediaStreamSource(stream);
      node = new AudioWorkletNode(audioCtx, "pcm-worklet");
      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (wsReady && ws && ws.readyState === WebSocket.OPEN) ws.send(e.data);
      };
      source.connect(node);
      node.connect(audioCtx.destination); // worklet emits silence, so no echo — keeps the graph pulling

      ws = new WebSocket(WS_URL);
      ws.binaryType = "arraybuffer";
      ws.onopen = () => {
        ws?.send(
          JSON.stringify({
            api_key: tok.apiKey,
            model: tok.model,
            audio_format: "pcm_s16le",
            sample_rate: Math.round(audioCtx.sampleRate),
            num_channels: 1,
            enable_endpoint_detection: true,
          }),
        );
        wsReady = true;
      };
      ws.onmessage = (ev: MessageEvent) => handleMessage(ev.data);
      ws.onclose = () => {
        wsReady = false;
      };
      ws.onerror = () => {
        /* onclose handles teardown state */
      };
    } catch {
      end(); // mic denied or audio setup failed
    }
  }

  return {
    supported: true,
    start() {
      void begin();
    },
    stop() {
      end();
    },
  };
}
