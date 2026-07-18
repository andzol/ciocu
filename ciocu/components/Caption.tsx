"use client";

import { Fragment } from "react";

/**
 * Ciocu's "voice" — she is silent and reacts only in writing. Rendered as luminous caption
 * text (no chat bubble), words fading up in a fast stagger so a sentence assembles in under a
 * second. Re-keyed on text change to replay the animation. aria-live announces her words.
 *
 * Splitting on /\s+/ rather than " " matters more than it looks: the model streams real newlines
 * and the occasional double space, and `split(" ")` kept those *inside* a token — so a single
 * caption-word span held "tisztábban.\n\nTe", which `white-space: pre` then rendered as literal
 * line breaks inside one inline-block, with the rest of the sentence baseline-aligned to its last
 * line. Her words came out shattered. Tokens are now pure words, and the separating space is a
 * text node *between* the spans, so it collapses and wraps the way ordinary text does.
 */
export default function Caption({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <p key={text} className="caption" aria-live="polite">
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 ? " " : null}
          <span className="caption-word" style={{ "--i": i } as React.CSSProperties}>
            {word}
          </span>
        </Fragment>
      ))}
    </p>
  );
}
