"use client";

import { useEffect, useRef } from "react";
import { createEyeEngine, type EyeEngineHandle } from "@/lib/eyes/engine";

/** Mounts the framework-agnostic eye engine and hands its control surface to the parent. */
export default function EyeStage({ onReady }: { onReady?: (handle: EyeEngineHandle) => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);

  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const node = mount.current;
    if (!node) return;
    const engine = createEyeEngine(node);
    readyRef.current?.(engine);
    return () => engine.destroy();
  }, []);

  return <div ref={mount} className="eye-stage" />;
}
