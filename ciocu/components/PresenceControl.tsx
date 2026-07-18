"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eye, EyeSlash, X } from "@phosphor-icons/react";
import type { AttentionHandle } from "@/lib/attention/faceAttention";

type UIState = "off" | "starting" | "on" | "denied" | "error";

/** Remembers that the dev readout was dismissed, so it stays gone across reloads. */
const DEVBOX_HIDDEN_KEY = "ciocu.devbox.hidden";
interface DebugInfo {
  faces: number;
  yaw: number;
  pitch: number;
  attending: boolean;
  gazeX: number;
  gazeY: number;
}

export interface PresenceHandle {
  /** Start eye contact (camera). Safe to call from the first-visit onboarding. */
  enable: () => void;
}

interface PresenceProps {
  onAttention: (attending: boolean) => void;
  onVoice: (level: number) => void;
  /** Where the person is, -1..1 per axis — drives her eyes to follow you (see faceAttention). */
  onGaze?: (x: number, y: number) => void;
  /** Reads her actual feeling + eye state out of the engine, for the ?debug line. Polled rather
   *  than pushed, so the eye engine's per-frame values never re-render the app. */
  getEyeDebug?: () => {
    state: string;
    moodV: number;
    moodA: number;
    tear: number;
    empV: number;
  } | null;
}

/**
 * Opt-in "eye contact" control. Off by default — Ciocu never grabs the camera on load. When on,
 * the camera runs on-device (MediaPipe) and an honest live dot shows it's active. A status line
 * tells you whether she currently sees you. Add ?debug to the URL for the raw detection numbers.
 * Exposes enable() via ref so the first-visit onboarding can turn it on.
 */
const PresenceControl = forwardRef<PresenceHandle, PresenceProps>(function PresenceControl(
  { onAttention, onVoice, onGaze, getEyeDebug },
  ref,
) {
  const [state, setState] = useState<UIState>("off");
  const [attending, setAttending] = useState(false);
  // TEMPORARY: ciocu.app is a test environment right now, so the detection + feeling readout is on
  // for everyone — no ?debug needed. Before real users arrive, put the gate back:
  //   typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug")
  const [debugOn] = useState(true);
  // Dismissed by the user (the × on the box). Persisted, because re-hiding a debug panel on every
  // reload is its own small annoyance — and read lazily so SSR and the first client render agree.
  const [debugHidden, setDebugHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      // ?debug is the way back: without it, dismissing would be one-way and the only cure would be
      // clearing site data. Visiting ciocu.app/?debug un-hides and forgets the dismissal.
      if (new URLSearchParams(window.location.search).has("debug")) {
        window.localStorage.removeItem(DEVBOX_HIDDEN_KEY);
        return false;
      }
      return window.localStorage.getItem(DEVBOX_HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  function hideDevbox() {
    setDebugHidden(true);
    try {
      window.localStorage.setItem(DEVBOX_HIDDEN_KEY, "1");
    } catch {
      /* private mode — it just won't persist */
    }
  }
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [feel, setFeel] = useState<{
    state: string;
    moodV: number;
    moodA: number;
    tear: number;
    empV: number;
  } | null>(null);
  const handleRef = useRef<AttentionHandle | null>(null);

  // Poll her feeling for the debug line. 5/s is plenty to watch mood drift and tears well up, and
  // it keeps the engine's 60fps values out of React entirely.
  useEffect(() => {
    // Hidden means hidden: don't keep polling the engine for a box nobody is looking at.
    if (!debugOn || debugHidden || !getEyeDebug) return;
    const id = window.setInterval(() => setFeel(getEyeDebug()), 200);
    return () => window.clearInterval(id);
  }, [debugOn, debugHidden, getEyeDebug]);

  useEffect(() => {
    return () => handleRef.current?.stop();
  }, []);

  async function enable() {
    if (state === "on" || state === "starting") return;
    setState("starting");
    try {
      const { startAttention } = await import("@/lib/attention/faceAttention");
      handleRef.current = await startAttention({
        onAttention: (a) => {
          setAttending(a);
          onAttention(a);
        },
        onVoice,
        onGaze,
        onStatus: (s) => {
          if (s === "running") setState("on");
          else if (s === "denied") setState("denied");
          else if (s === "error") setState("error");
        },
        onDebug: debugOn ? (info) => setDebug(info) : undefined,
      });
    } catch {
      setState("error");
    }
  }

  function disable() {
    handleRef.current?.stop();
    handleRef.current = null;
    onAttention(false);
    onVoice(0);
    setAttending(false);
    setDebug(null);
    setState("off");
  }

  function toggle() {
    if (state === "on" || state === "starting") disable();
    else enable();
  }

  // stable enable() for the imperative handle (always calls the latest closure)
  const enableRef = useRef(enable);
  enableRef.current = enable;
  useImperativeHandle(ref, () => ({ enable: () => enableRef.current() }), []);

  const active = state === "on";
  const label = active ? "Turn off eye contact" : "Let Ciocu see you";

  return (
    <div className="presence-control">
      {(state === "denied" || state === "error" || state === "starting") && (
        <span className="presence-hint" role="status">
          {state === "starting"
            ? "Waking up…"
            : state === "denied"
              ? "Camera blocked — allow it in your browser."
              : "Couldn't start the camera."}
        </span>
      )}

      {active && (
        <span
          className={`presence-status${attending ? " presence-status--met" : ""}`}
          role="status"
        >
          <span className="presence-status-dot" aria-hidden="true" />
          {attending ? "Eye contact — she sees you" : "Looking for you…"}
        </span>
      )}

      {/* The raw numbers get their own box under the status — inline they made one very long line.
          Dismissible: it's developer instrumentation sitting on top of her face. */}
      {active && debugOn && !debugHidden && (debug || feel) && (
        <div className="presence-devbox">
          <button
            type="button"
            className="presence-devbox-close"
            aria-label="Hide debug readout"
            title="Hide debug readout"
            onClick={hideDevbox}
          >
            <X size={12} weight="bold" />
          </button>
          {debug && (
            <span className="presence-debug">
              {`faces ${debug.faces} · yaw ${debug.yaw.toFixed(2)} · pitch ${debug.pitch.toFixed(2)} · gaze ${debug.gazeX.toFixed(2)},${debug.gazeY.toFixed(2)}`}
            </span>
          )}
          {/* How she feels vs. what the eyes are doing — the two should always agree. `reads you` is
              what she picked up from your last message, and it's what actually brings the tears. */}
          {feel && (
            <span className="presence-feel">
              {`feels · valence ${feel.moodV >= 0 ? "+" : ""}${feel.moodV.toFixed(2)} · arousal ${feel.moodA.toFixed(2)} · reads you ${feel.empV >= 0 ? "+" : ""}${feel.empV.toFixed(2)} · tears ${feel.tear.toFixed(2)} · eyes "${feel.state}"`}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        className={`icon-button${active ? " icon-button--active" : ""}`}
        onClick={toggle}
        aria-pressed={active}
        aria-label={label}
        title={label}
      >
        {active ? <Eye size={22} weight="fill" /> : <EyeSlash size={22} />}
        {active && <span className={`live-dot${attending ? " live-dot--met" : ""}`} aria-hidden="true" />}
      </button>
    </div>
  );
});

export default PresenceControl;
