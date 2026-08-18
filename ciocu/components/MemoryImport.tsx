"use client";

// The memory-upload flow: confirm → she closes her eyes and takes it in → she opens them and says
// what changed.
//
// This deliberately lives at app level rather than in the menu. Choosing a file dismisses the menu
// (the file dialog steals focus, which trips its outside-click handler), and closing the menu also
// clears its `hint` — so the old flow's only feedback, setHint("Couldn't read that memory file."),
// could never actually be seen. Clicking upload and having nothing at all happen was the result.

import { useCallback, useEffect, useState } from "react";
import { Brain, Warning } from "@phosphor-icons/react";
import {
  isBundle,
  mergeBundle,
  summarizeBundle,
  type BundleSummary,
  type MemoryBundle,
} from "@/lib/memory/bundle";

/** Dispatched by the menu with the chosen File once the picker resolves. */
export const MEMORY_FILE_EVENT = "ciocu:memory-file";

type Phase =
  | { at: "idle" }
  | { at: "confirm"; bundle: MemoryBundle; summary: BundleSummary }
  | { at: "working"; frac: number; label: string }
  | { at: "done"; mode: "merge" | "replace"; added: { threads: number; messages: number; blocks: number } }
  | { at: "error"; message: string };

function plural(n: number, one: string, many = one + "s") {
  return `${n} ${n === 1 ? one : many}`;
}

export default function MemoryImport({ onLids }: { onLids?: (v: number) => void }) {
  const [phase, setPhase] = useState<Phase>({ at: "idle" });

  useEffect(() => {
    async function onFile(e: Event) {
      const file = (e as CustomEvent<File>).detail;
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!isBundle(data)) {
          setPhase({ at: "error", message: "That doesn't look like a Ciocu memory file." });
          return;
        }
        const summary = summarizeBundle(data);
        if (summary.blocks === 0 && summary.threads === 0 && summary.messages === 0) {
          setPhase({ at: "error", message: "That file is a Ciocu memory file, but it's empty." });
          return;
        }
        setPhase({ at: "confirm", bundle: data, summary });
      } catch {
        setPhase({ at: "error", message: "That file couldn't be read as JSON." });
      }
    }
    window.addEventListener(MEMORY_FILE_EVENT, onFile);
    return () => window.removeEventListener(MEMORY_FILE_EVENT, onFile);
  }, []);

  const run = useCallback(
    async (bundle: MemoryBundle, mode: "merge" | "replace") => {
      setPhase({ at: "working", frac: 0, label: "Reading the file" });
      onLids?.(0); // she closes her eyes while she takes it in
      try {
        const added = await mergeBundle(bundle, {
          mode,
          onProgress: ({ frac, label }) => setPhase({ at: "working", frac, label }),
        });
        onLids?.(1);
        setPhase({ at: "done", mode, added });
      } catch {
        onLids?.(1);
        setPhase({ at: "error", message: "Something went wrong while saving those memories." });
      }
    },
    [onLids],
  );

  // Reload on dismiss so the thread and her mood rehydrate from what's now stored.
  const finish = useCallback(() => window.location.reload(), []);

  useEffect(() => {
    if (phase.at !== "confirm" && phase.at !== "error") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPhase({ at: "idle" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase.at]);

  if (phase.at === "idle") return null;

  return (
    <div className="import-backdrop" role="dialog" aria-modal="true" aria-label="Import memory">
      <div className="import-card">
        {phase.at === "confirm" && (
          <>
            <h2 className="import-title">
              <Brain size={20} weight="regular" /> Bring in this memory file?
            </h2>
            <ul className="import-facts">
              <li>{plural(phase.summary.blocks, "memory", "memories")}</li>
              {phase.summary.messages > 0 && <li>{plural(phase.summary.messages, "message")}</li>}
              {phase.summary.threads > 0 && <li>{plural(phase.summary.threads, "conversation")}</li>}
            </ul>
            {phase.summary.needEmbedding > 0 && (
              <p className="import-note">
                {`${plural(phase.summary.needEmbedding, "memory", "memories")} came without their ` +
                  `index, so she'll read ${phase.summary.needEmbedding === 1 ? "it" : "them"} ` +
                  `properly on this device first. That takes a moment.`}
              </p>
            )}
            {phase.summary.unusable > 0 && (
              <p className="import-note">
                {plural(phase.summary.unusable, "entry", "entries")} had no text and will be skipped.
              </p>
            )}
            <p className="import-choice">
              <strong>Merge</strong>{" "}
              keeps everything she already remembers and adds these to it.{" "}
              <strong>Replace</strong>{" "}
              forgets what&apos;s on this device first — that can&apos;t be undone.
            </p>
            <div className="import-actions">
              <button type="button" className="btn-ghost" onClick={() => setPhase({ at: "idle" })}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-ghost import-danger"
                onClick={() => run(phase.bundle, "replace")}
              >
                Replace everything
              </button>
              <button
                type="button"
                className="plan-btn"
                onClick={() => run(phase.bundle, "merge")}
              >
                Merge
              </button>
            </div>
          </>
        )}

        {phase.at === "working" && (
          <>
            <h2 className="import-title">
              <Brain size={20} weight="regular" /> {phase.label}…
            </h2>
            <div
              className="import-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(phase.frac * 100)}
            >
              <div className="import-bar-fill" style={{ width: `${Math.round(phase.frac * 100)}%` }} />
            </div>
            <p className="import-note">Her eyes are closed while she takes this in.</p>
          </>
        )}

        {phase.at === "done" && (
          <>
            <h2 className="import-title">
              <Brain size={20} weight="regular" />{" "}
              {phase.mode === "replace" ? "Replaced" : "Merged"}
            </h2>
            <ul className="import-facts">
              <li>{plural(phase.added.blocks, "new memory", "new memories")}</li>
              {phase.added.messages > 0 && (
                <li>{plural(phase.added.messages, "message")} restored</li>
              )}
              {phase.added.threads > 0 && (
                <li>{plural(phase.added.threads, "conversation")} restored</li>
              )}
            </ul>
            <p className="import-note">
              {phase.added.blocks === 0 && phase.mode === "merge"
                ? "She already remembered everything in that file."
                : "She has them now."}
            </p>
            <div className="import-actions">
              <button type="button" className="plan-btn" onClick={finish}>
                Continue
              </button>
            </div>
          </>
        )}

        {phase.at === "error" && (
          <>
            <h2 className="import-title import-title--warn">
              <Warning size={20} weight="regular" /> Couldn&apos;t import that
            </h2>
            <p className="import-note">{phase.message}</p>
            <div className="import-actions">
              <button type="button" className="plan-btn" onClick={() => setPhase({ at: "idle" })}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
