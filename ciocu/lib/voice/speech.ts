// Voice input via the browser Web Speech API. Gated by attention (started only while Ciocu sees
// you). NOTE: in Chrome this sends audio to Google's servers — a deliberate M3 tradeoff for speed;
// a local Whisper swap keeps it on-device later.

export interface VoiceHandle {
  supported: boolean;
  start: () => void;
  stop: () => void;
}

interface VoiceOptions {
  lang?: string;
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
}

// Minimal typings for the non-standard SpeechRecognition API.
interface SRAlt { transcript: string }
interface SRResult { 0: SRAlt; isFinal: boolean }
interface SREvent { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SRInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
}
type SRCtor = new () => SRInstance;

export function createVoice({ lang, onFinal, onInterim }: VoiceOptions): VoiceHandle {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return { supported: false, start: () => {}, stop: () => {} };

  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = lang ?? navigator.language ?? "en-US";

  let running = false;
  let wantRunning = false;

  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const text = r[0]?.transcript?.trim();
      if (!text) continue;
      if (r.isFinal) onFinal(text);
      else onInterim?.(text);
    }
  };
  rec.onend = () => {
    running = false;
    if (wantRunning) {
      try {
        rec.start();
        running = true;
      } catch {
        /* will retry on next start() */
      }
    }
  };
  rec.onerror = () => {
    /* transient (no-speech, network); onend handles restart */
  };

  return {
    supported: true,
    start() {
      wantRunning = true;
      if (!running) {
        try {
          rec.start();
          running = true;
        } catch {
          /* already starting */
        }
      }
    },
    stop() {
      wantRunning = false;
      if (running) {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
