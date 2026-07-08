"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { AttentionHandle } from "@/lib/attention/faceAttention";

type UIState = "off" | "starting" | "on" | "denied" | "error";
interface DebugInfo {
  faces: number;
  yaw: number;
  pitch: number;
  attending: boolean;
}

/**
 * Opt-in "eye contact" control. Off by default — Ciocu never grabs the camera on load. When on,
 * the camera runs on-device (MediaPipe) and an honest live dot shows it's active. A status line
 * tells you whether she currently sees you. Add ?debug to the URL for the raw detection numbers.
 */
export default function PresenceControl({
  onAttention,
  onVoice,
}: {
  onAttention: (attending: boolean) => void;
  onVoice: (level: number) => void;
}) {
  const [state, setState] = useState<UIState>("off");
  const [attending, setAttending] = useState(false);
  const [debugOn] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"),
  );
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const handleRef = useRef<AttentionHandle | null>(null);

  useEffect(() => {
    return () => handleRef.current?.stop();
  }, []);

  async function enable() {
    setState("starting");
    try {
      const { startAttention } = await import("@/lib/attention/faceAttention");
      handleRef.current = await startAttention({
        onAttention: (a) => {
          setAttending(a);
          onAttention(a);
        },
        onVoice,
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
          {debugOn && debug && (
            <span className="presence-debug">
              {` · faces ${debug.faces} · yaw ${debug.yaw.toFixed(2)} · pitch ${debug.pitch.toFixed(2)}`}
            </span>
          )}
        </span>
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
}
