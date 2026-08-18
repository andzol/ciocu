"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Ciocu's "voice" — she is silent and reacts only in writing, so this is the whole of how she
 * speaks. Words arrive one at a time at a speaking cadence inside a window a fixed number of lines
 * tall; when a word wraps onto a new line the block slides up by exactly one line, so the newest
 * words are always on the bottom line and older ones drift off the top.
 *
 * It used to receive the finished reply in one call and fade every word in over final geometry. Two
 * things followed: nothing happened at all until the whole response had streamed, and the band grew
 * to whatever height the text needed — taking that space straight out of .eye-stage, which is
 * flex: 1 1 auto. Long answers literally shrank her eyes. The window is now a fixed height, so the
 * eyes never move whatever she says.
 *
 * The cadence is the point. A uniform typewriter reads as a machine printing; speech has rhythm, so
 * each word's delay carries a length term and — the part that actually sells it — a pause after
 * commas and a longer one after full stops. She breathes where a person would.
 *
 * Splitting on /\s+/ rather than " " matters more than it looks: the model streams real newlines
 * and the occasional double space, and `split(" ")` kept those *inside* a token — so a single
 * caption-word span held "tisztábban.\n\nTe", which `white-space: pre` then rendered as literal
 * line breaks inside one inline-block. Her words came out shattered.
 */

// Per-word timing, before the pace scale below is applied.
const BASE_MS = 95; // the cost of saying anything at all
const PER_CHAR_MS = 14; // longer words take longer to say
const MAX_WORD_CHARS = 16; // past this a word doesn't keep getting slower
const CLAUSE_PAUSE_MS = 180; // after , ; : —
const SENTENCE_PAUSE_MS = 420; // after . ! ? …

// A long answer shouldn't take a minute to deliver, so the whole curve compresses toward a target
// — never past half speed, which is where it would start reading as a machine again.
const TARGET_TOTAL_MS = 13_000;
const MIN_SCALE = 0.5;
const TYPICAL_WORD_MS = 205; // base + chars + amortised punctuation, for estimating the total

const SLIDE_MS = 420;

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** The pause a word leaves *behind* it — trailing quotes and brackets don't hide the punctuation. */
function pauseAfter(word: string): number {
  if (!word) return 0;
  const w = word.replace(/["'”’)\]]+$/, "");
  if (/[.!?…]$/.test(w)) return SENTENCE_PAUSE_MS;
  if (/[,;:—–]$/.test(w)) return CLAUSE_PAUSE_MS;
  return 0;
}

function paceScale(wordCount: number): number {
  if (wordCount <= 0) return 1;
  const estimate = wordCount * TYPICAL_WORD_MS;
  return Math.max(MIN_SCALE, Math.min(1, TARGET_TOTAL_MS / estimate));
}

/** Distinct line boxes, read off the word spans' own offsets — no text measuring needed. */
function countLines(flow: HTMLElement): number {
  const tops = new Set<number>();
  for (const span of flow.querySelectorAll<HTMLElement>(".caption-word")) {
    tops.add(Math.round(span.offsetTop));
  }
  return tops.size;
}

function lineHeightPx(flow: HTMLElement): number {
  const lh = parseFloat(getComputedStyle(flow).lineHeight);
  if (Number.isFinite(lh) && lh > 0) return lh;
  return parseFloat(getComputedStyle(flow).fontSize) * 1.28;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

export default function Caption({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const [revealed, setRevealed] = useState(0);
  const [overflowing, setOverflowing] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLParagraphElement>(null);
  const linesRef = useRef(0);
  const shownRef = useRef<string[]>([]);
  const reduced = usePrefersReducedMotion();

  const words = useMemo(() => tokenize(text), [text]);
  // Mid-stream the tail is often half a word. Holding it back until a space (or the end of the
  // stream) proves it complete keeps words from visibly growing letters after they've appeared.
  const available = streaming && text.length > 0 && !/\s$/.test(text)
    ? Math.max(0, words.length - 1)
    : words.length;

  // Reduced motion shows the whole thing at once — derived, never stored.
  const shown = reduced ? available : revealed;

  // A new utterance — not just more of the current one — starts over from nothing.
  //
  // The test is "are the words she has already said still the same words", NOT whether the new text
  // extends the old string. Two things break the string test: the stream's tail is often half a word
  // ("Hel" then "Hello"), and the finalizer sends reply.trim() while the stream sent it untrimmed —
  // so a leading space would make the final call look like a brand new sentence and replay the
  // entire reveal from zero at the end of every single answer.
  useEffect(() => {
    const prev = shownRef.current;
    const continues =
      prev.length > 0 && prev.length <= words.length && prev.every((w, i) => w === words[i]);
    if (continues) return;
    setRevealed(0);
    setOverflowing(false);
    linesRef.current = 0;
    const flow = flowRef.current;
    if (flow) {
      flow.style.transition = "none";
      flow.style.transform = "translateY(0)";
    }
  }, [words]);

  // Reveal the next word when its time comes. The delay belongs to the word about to appear, plus
  // whatever pause the previous word earned — that's what puts the silence after the full stop
  // rather than before it.
  useEffect(() => {
    if (reduced || revealed >= available) return;
    const scale = paceScale(Math.max(available, words.length));
    const word = words[revealed] ?? "";
    const delay =
      (BASE_MS + Math.min(word.length, MAX_WORD_CHARS) * PER_CHAR_MS + pauseAfter(words[revealed - 1] ?? "")) *
      scale;
    const t = setTimeout(() => setRevealed((r) => r + 1), delay);
    return () => clearTimeout(t);
  }, [revealed, available, reduced, words]);

  // Slide up by exactly the lines just gained. Done as a FLIP — jump the block back down to where
  // it was, then release — because the layout has *already* moved by the time we can see it; there
  // is no "before" to transition from otherwise.
  useLayoutEffect(() => {
    const flow = flowRef.current;
    const win = windowRef.current;
    if (!flow || !win) return;

    const lines = countLines(flow);
    const prev = linesRef.current;
    linesRef.current = lines;

    const lh = lineHeightPx(flow);
    setOverflowing(lines > Math.round(win.clientHeight / lh));

    if (reduced || prev === 0 || lines <= prev) return;
    flow.style.transition = "none";
    flow.style.transform = `translateY(${(lines - prev) * lh}px)`;
    void flow.offsetHeight; // commit the displaced position before animating away from it
    flow.style.transition = `transform ${SLIDE_MS}ms var(--ease-out)`;
    flow.style.transform = "translateY(0)";
  }, [revealed, reduced]);

  useEffect(() => {
    shownRef.current = words.slice(0, shown);
  }, [words, shown]);

  // The font size is vw-based, so a resize changes how many lines the same words occupy.
  useEffect(() => {
    function remeasure() {
      const flow = flowRef.current;
      const win = windowRef.current;
      if (!flow || !win) return;
      const lines = countLines(flow);
      linesRef.current = lines;
      setOverflowing(lines > Math.round(win.clientHeight / lineHeightPx(flow)));
    }
    window.addEventListener("resize", remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, []);

  // For when you'd rather just read the rest.
  const finishNow = useCallback(() => setRevealed(available), [available]);

  const stillSpeaking = shown < available;

  return (
    <div
      ref={windowRef}
      className="caption-window"
      data-overflowing={overflowing ? "" : undefined}
      onClick={stillSpeaking ? finishNow : undefined}
      style={stillSpeaking ? { cursor: "pointer" } : undefined}
    >
      <p ref={flowRef} className="caption" aria-hidden="true">
        {words.slice(0, shown).map((word, i) => (
          // The separating space is a text node BETWEEN the spans, never inside one: a span is an
          // inline-block, so a space living inside it is trapped and stops being a wrap opportunity.
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <span className="caption-word">{word}</span>
          </Fragment>
        ))}
      </p>
      {/* Announced once, whole — a screen reader shouldn't hear her a word at a time. */}
      <p className="sr-only" aria-live="polite">
        {streaming ? "" : text}
      </p>
    </div>
  );
}
