// On-device attention tracker. Webcam -> MediaPipe FaceLandmarker -> "is the person facing
// Ciocu?" With hysteresis so it doesn't flicker. While attending, a gated mic runs voice-activity
// detection (amplitude only — NO transcription; that's M3) to pulse her glow. Everything here
// stays on the device: no frames or audio ever leave the browser.
//
// Loaded only on demand (dynamic import from the presence toggle), so MediaPipe never touches the
// initial bundle or SSR.

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Tuning
const DETECT_INTERVAL_MS = 66; // ~15 detections/sec — plenty for gating, easy on the CPU
// Her eyes should follow where you actually are, so we read the nose tip's position in the frame
// (landmark 1 of MediaPipe's mesh) rather than the head's rotation — moving across the camera is a
// translation, not a turn.
//
// MIRROR: the raw camera image is not mirrored, so it sees you like another person would — step to
// your right and you travel toward the image's LEFT. For her to look *at* you rather than away, x is
// flipped. Y needs no flip: move up and you rise in the frame, and the engine's +y is already down.
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

const NOSE_TIP = 1;
// A face only drifts across a fraction of the frame in normal use, so amplify it — otherwise
// leaning aside would barely move her pupils. Clamped, so big movements just peg the look.
const FACE_GAIN = 2.2;

const YAW_LIMIT = 0.40; // rad (~23°) left/right head turn still counts as "facing me"
const PITCH_LIMIT = 0.34; // rad (~19°) up/down
const ON_DEBOUNCE_MS = 250; // must attend this long before she switches to listening
const OFF_DEBOUNCE_MS = 750; // must look away this long before she relaxes (hysteresis)
const VAD_FLOOR = 0.015; // RMS below this reads as silence
const VAD_CEIL = 0.16; // RMS at/above this reads as full voice

export type AttentionStatus =
  | "starting"
  | "running"
  | "denied" // user blocked the camera
  | "error"
  | "stopped";

export interface AttentionCallbacks {
  onAttention: (attending: boolean) => void;
  onVoice: (level: number) => void; // 0..1, only meaningful while attending
  /**
   * Where you are, so her eyes can follow you: -1..1 on each axis, already in *her* frame of
   * reference (see FACE_GAIN / the mirror note below). Fires while a face is visible.
   */
  onGaze?: (x: number, y: number) => void;
  onStatus: (status: AttentionStatus, detail?: string) => void;
  onDebug?: (info: {
    faces: number;
    yaw: number;
    pitch: number;
    attending: boolean;
    gazeX: number; // the same value handed to onGaze — visible via ?debug so the mirror is checkable
    gazeY: number;
  }) => void;
}

export interface AttentionHandle {
  stop: () => void;
}

/** Extract yaw/pitch (radians) from MediaPipe's column-major 4x4 facial transform matrix. */
function headAngles(data: number[]): { yaw: number; pitch: number } {
  // column-major: data[col*4 + row]
  const m20 = data[2], m21 = data[6], m22 = data[10];
  const pitch = Math.atan2(m21, m22);
  const yaw = Math.atan2(-m20, Math.hypot(m21, m22));
  return { yaw, pitch };
}

export async function startAttention(cb: AttentionCallbacks): Promise<AttentionHandle> {
  cb.onStatus("starting");

  let stopped = false;
  let cameraStream: MediaStream | null = null;
  let micStream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let vadBuf: Float32Array<ArrayBuffer> | null = null;
  let landmarker: FaceLandmarker | null = null;
  let rafId = 0;
  let lastDetect = 0;

  // hysteresis state
  let attending = false;
  let rawAttending = false;
  let sinceChange = 0;

  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;

  function openMic() {
    if (micStream) return;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((stream) => {
        if (stopped || !attending) {
          // looked away during the async grab — don't keep it
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStream = stream;
        audioCtx = new AudioContext();
        const src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        vadBuf = new Float32Array(analyser.fftSize);
        src.connect(analyser);
      })
      .catch(() => {
        /* mic optional — gaze still works without it */
      });
  }

  function closeMic() {
    micStream?.getTracks().forEach((t) => t.stop());
    micStream = null;
    audioCtx?.close().catch(() => {});
    audioCtx = null;
    analyser = null;
    vadBuf = null;
    cb.onVoice(0);
  }

  function readVoice(): number {
    if (!analyser || !vadBuf) return 0;
    analyser.getFloatTimeDomainData(vadBuf);
    let sum = 0;
    for (let i = 0; i < vadBuf.length; i++) sum += vadBuf[i] * vadBuf[i];
    const rms = Math.sqrt(sum / vadBuf.length);
    return Math.max(0, Math.min(1, (rms - VAD_FLOOR) / (VAD_CEIL - VAD_FLOOR)));
  }

  function setAttending(next: boolean) {
    if (next === attending) return;
    attending = next;
    cb.onAttention(next);
    if (next) openMic();
    else closeMic();
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });
  } catch (e) {
    const err = e as DOMException;
    cb.onStatus(err?.name === "NotAllowedError" ? "denied" : "error", err?.message);
    return { stop() {} };
  }
  if (stopped) {
    cameraStream.getTracks().forEach((t) => t.stop());
    return { stop() {} };
  }

  video.srcObject = cameraStream;
  await video.play().catch(() => {});

  try {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
    });
  } catch (e) {
    cb.onStatus("error", (e as Error)?.message);
    cameraStream.getTracks().forEach((t) => t.stop());
    return { stop() {} };
  }

  cb.onStatus("running");

  function loop(now: number) {
    if (stopped) return;
    rafId = requestAnimationFrame(loop);

    if (now - lastDetect >= DETECT_INTERVAL_MS && video.readyState >= 2 && landmarker) {
      const dt = now - lastDetect;
      lastDetect = now;
      let faces = 0;
      let yaw = 0;
      let pitch = 0;
      let gazeX = 0;
      let gazeY = 0;
      try {
        const res = landmarker.detectForVideo(video, now);
        faces = res.faceLandmarks?.length ?? 0;
        const mtx = res.facialTransformationMatrixes?.[0]?.data;
        if (faces > 0 && mtx) {
          ({ yaw, pitch } = headAngles(Array.from(mtx)));
          rawAttending = Math.abs(yaw) < YAW_LIMIT && Math.abs(pitch) < PITCH_LIMIT;
          // Follow where you are. Landmarks are normalized 0..1 across the frame; recentre to
          // -1..1, amplify, and flip x out of camera-space into her point of view.
          const nose = res.faceLandmarks?.[0]?.[NOSE_TIP];
          if (nose) {
            const nx = (nose.x - 0.5) * 2;
            const ny = (nose.y - 0.5) * 2;
            gazeX = clamp(-nx * FACE_GAIN, -1, 1);
            gazeY = clamp(ny * FACE_GAIN, -1, 1);
            cb.onGaze?.(gazeX, gazeY);
          }
        } else {
          rawAttending = false;
        }
      } catch {
        rawAttending = false;
      }

      // hysteresis: require sustained change before flipping state
      if (rawAttending === attending) {
        sinceChange = 0;
      } else {
        sinceChange += dt;
        const need = rawAttending ? ON_DEBOUNCE_MS : OFF_DEBOUNCE_MS;
        if (sinceChange >= need) {
          setAttending(rawAttending);
          sinceChange = 0;
        }
      }
      cb.onDebug?.({ faces, yaw, pitch, attending, gazeX, gazeY });
    }

    if (attending && analyser) cb.onVoice(readVoice());
  }
  rafId = requestAnimationFrame(loop);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(rafId);
      closeMic();
      cameraStream?.getTracks().forEach((t) => t.stop());
      cameraStream = null;
      video.srcObject = null;
      landmarker?.close();
      landmarker = null;
      cb.onAttention(false);
      cb.onStatus("stopped");
    },
  };
}
