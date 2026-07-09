"use client";

import { useEffect, useState } from "react";

const KEY = "ciocu.onboarded";

/**
 * First-visit invitation to turn on eye contact. Browsers won't pop the native camera/mic prompt
 * on page load (it needs a user gesture), so we invite the visitor — and clicking "Enable" grabs
 * camera + mic permission in a single prompt, then hands off to the attention system.
 */
export default function Onboarding({ onEnable }: { onEnable: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = !!localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = setTimeout(() => setShow(true), 900); // let the eyes appear first
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  async function enable() {
    // One prompt for both — permission now, but the streams still only run while she sees you.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* denied/unavailable — still hand off; PresenceControl surfaces the state */
    }
    onEnable();
    dismiss();
  }

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show]);

  if (!show) return null;

  return (
    <div className="onboard-backdrop" onClick={dismiss}>
      <div
        className="onboard-card"
        role="dialog"
        aria-modal="true"
        aria-label="Let Ciocu see you"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="onboard-title">Let Ciocu see you</h2>
        <p className="onboard-body">
          She comes alive when she can see you — she looks back, and listens only while you hold her
          gaze. Look away and she rests. Your camera and microphone never leave your device.
        </p>
        <div className="onboard-actions">
          <button type="button" className="onboard-primary" onClick={enable} autoFocus>
            Enable camera &amp; mic
          </button>
          <button type="button" className="onboard-secondary" onClick={dismiss}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
