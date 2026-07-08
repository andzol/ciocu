// Expression + presence presets for the eye engine.
// Ported from anime-eye-research/prototype (v6 "plush companion", the picked candidate).
// Emotion layer sets shape+color; presence layer sets gaze+motion. For M1 they live in one
// table; the two-layer composition (research doc 03/04) is a later refinement.

export type GazeMode = "follow" | "wander" | "lock";
export type Routine =
  | "bounce"
  | "pop"
  | "swoon"
  | "wink"
  | "converge"
  | "nod"
  | "pulse";

export interface Preset {
  open: number; // vertical openness
  topBend: number; // upper edge extent multiplier
  botBend: number; // lower edge extent multiplier (negative => smile crescent)
  tilt: number; // inner-corner rotation (deg), mirrored L/R
  pupil: number; // pupil scale
  gaze: { x: number; y: number }; // base gaze
  glow: number; // rim + bloom intensity
  hue: number; // mood hue shift (deg), cyan default = 0
  sat: number; // mood saturation
  gtilt: number; // whole-face head tilt (questioning)
  speed: number; // ease rate 0..1 (higher = snappier)
  jitter: number; // per-frame tremble
  blinkS: number; // blink interval/length scale
  mode: GazeMode; // gaze behaviour
  enter?: Routine; // one-shot routine on select
}

export type StateName =
  | "neutral"
  | "happy"
  | "surprised"
  | "sad"
  | "angry"
  | "sleepy"
  | "love"
  | "wink"
  | "idle"
  | "listening"
  | "question"
  | "affirmative"
  | "focused"
  | "thinking";

export const PRESETS: Record<StateName, Preset> = {
  neutral:     { open: 1.04, topBend: 0.96, botBend: 1.02,  tilt: 0,   pupil: 1.02, gaze: { x: 0, y: 0 },      glow: 1.08, hue: 0,    sat: 1,    gtilt: 0,  speed: 0.11, jitter: 0,    blinkS: 1,    mode: "follow" },
  happy:       { open: 0.84, topBend: 0.86, botBend: -0.62, tilt: 0,   pupil: 1.22, gaze: { x: 0, y: -0.1 },   glow: 1.34, hue: 8,    sat: 1.04, gtilt: 0,  speed: 0.16, jitter: 0,    blinkS: 0.9,  mode: "follow", enter: "bounce" },
  surprised:   { open: 1.28, topBend: 1.18, botBend: 1.14,  tilt: 0,   pupil: 0.68, gaze: { x: 0, y: 0 },      glow: 1.45, hue: 0,    sat: 1,    gtilt: 0,  speed: 0.28, jitter: 0,    blinkS: 1.45, mode: "follow", enter: "pop" },
  sad:         { open: 0.74, topBend: 0.66, botBend: 0.96,  tilt: -10, pupil: 1.28, gaze: { x: 0, y: 0.36 },   glow: 0.72, hue: -10,  sat: 0.78, gtilt: 0,  speed: 0.07, jitter: 0.35, blinkS: 1.25, mode: "follow" },
  angry:       { open: 0.58, topBend: 0.56, botBend: 0.82,  tilt: 13,  pupil: 0.78, gaze: { x: 0, y: 0.01 },   glow: 1.22, hue: -140, sat: 1.15, gtilt: 0,  speed: 0.18, jitter: 0.75, blinkS: 1.35, mode: "follow" },
  sleepy:      { open: 0.36, topBend: 0.88, botBend: 0.92,  tilt: -5,  pupil: 1.05, gaze: { x: 0, y: 0.26 },   glow: 0.55, hue: -8,   sat: 0.72, gtilt: 0,  speed: 0.06, jitter: 0,    blinkS: 2.4,  mode: "follow" },
  love:        { open: 1.02, topBend: 0.96, botBend: 0.48,  tilt: 0,   pupil: 1.36, gaze: { x: 0, y: -0.1 },   glow: 1.38, hue: 128,  sat: 1.15, gtilt: 0,  speed: 0.12, jitter: 0,    blinkS: 0.95, mode: "follow", enter: "swoon" },
  wink:        { open: 0.84, topBend: 0.86, botBend: -0.52, tilt: 0,   pupil: 1.18, gaze: { x: 0, y: -0.03 },  glow: 1.26, hue: 8,    sat: 1.04, gtilt: 0,  speed: 0.18, jitter: 0,    blinkS: 1,    mode: "follow", enter: "wink" },

  // presence states
  idle:        { open: 1.04, topBend: 0.96, botBend: 1.02,  tilt: 0,   pupil: 1.02, gaze: { x: 0, y: 0 },       glow: 1.05, hue: 0,   sat: 1,    gtilt: 0, speed: 0.1,  jitter: 0, blinkS: 1,    mode: "follow" },
  listening:   { open: 1.1,  topBend: 1.02, botBend: 1.0,   tilt: 0,   pupil: 1.12, gaze: { x: 0, y: -0.06 },   glow: 1.23, hue: 0,   sat: 1,    gtilt: 0, speed: 0.14, jitter: 0, blinkS: 0.8,  mode: "lock",   enter: "pulse" },
  question:    { open: 1.02, topBend: 1.02, botBend: 0.98,  tilt: 0,   pupil: 1.1,  gaze: { x: 0.12, y: -0.3 }, glow: 1.16, hue: 0,   sat: 1,    gtilt: 9, speed: 0.14, jitter: 0, blinkS: 1.15, mode: "lock" },
  affirmative: { open: 0.9,  topBend: 0.88, botBend: -0.36, tilt: 0,   pupil: 1.18, gaze: { x: 0, y: -0.04 },   glow: 1.34, hue: 6,   sat: 1.04, gtilt: 0, speed: 0.2,  jitter: 0, blinkS: 0.9,  mode: "lock",   enter: "nod" },
  focused:     { open: 0.72, topBend: 0.72, botBend: 0.82,  tilt: 3,   pupil: 0.86, gaze: { x: 0, y: -0.05 },   glow: 1.28, hue: 0,   sat: 1.06, gtilt: 0, speed: 0.15, jitter: 0, blinkS: 2.0,  mode: "lock",   enter: "converge" },
  thinking:    { open: 0.88, topBend: 0.9,  botBend: 0.98,  tilt: 0,   pupil: 1.04, gaze: { x: -0.28, y: -0.32 }, glow: 1.08, hue: 0,  sat: 1,    gtilt: 0, speed: 0.09, jitter: 0, blinkS: 1.55, mode: "wander" },
};
