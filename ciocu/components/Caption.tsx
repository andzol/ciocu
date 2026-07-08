"use client";

/**
 * Ciocu's "voice" — she is silent and reacts only in writing. Rendered as luminous caption
 * text (no chat bubble), words fading up in a fast stagger so a sentence assembles in under a
 * second. Re-keyed on text change to replay the animation. aria-live announces her words.
 */
export default function Caption({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <p key={text} className="caption" aria-live="polite">
      {words.map((word, i) => (
        <span
          key={i}
          className="caption-word"
          style={{ "--i": i } as React.CSSProperties}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
