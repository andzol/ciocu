"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { AttentionHandle } from "@/lib/attention/faceAttention";

type UIState = "off" | "starting" | "on" | "denied" | "error";

/**
 * Opt-in "eye contact" control. Off by default — Ciocu never grabs the camera on load. When on,
 * the camera runs on-device (MediaPipe) and an honest live dot shows it's active. Toggling off
 * stops every track immediately.
 */
export default function PresenceControl({
  onAttention,
  onVoice,
}: {
  onAttention: (attending: boolean) => void;
  onVoice: (level: number) => void;
}) {
  const [state, setState] = useState<UIState>("off");
  const handleRef = useRef<AttentionHandle | null>(null);

  useEffect(() => () => handleRef.current?.stop(), []);

  async function enable() {
    setState("starting");
    try {
      const { startAttention } = await import("@/lib/attention/faceAttention");
      handleRef.current = await startAttention({
        onAttention,
        onVoice,
        onStatus: (s) => {
          if (s === "running") setState("on");
          else if (s === "denied") setState("denied");
          else if (s === "error") setState("error");
        },
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
      <button
        type="button"
        className={`icon-button${active ? " icon-button--active" : ""}`}
        onClick={toggle}
        aria-pressed={active}
        aria-label={label}
        title={label}
      >
        {active ? <Eye size={22} weight="fill" /> : <EyeSlash size={22} />}
        {active && <span className="live-dot" aria-hidden="true" />}
      </button>
    </div>
  );
}
