// Expression + presence presets for the eye engine.
// Ported verbatim from anime-eye-research/prototype (v4 "liquid-eye", the picked candidate).
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
  neutral:     { open: 1.0,  topBend: 0.94, botBend: 1.08,  tilt: 0,   pupil: 1.0,  gaze: { x: 0, y: 0 },      glow: 1.0,  hue: 0,    sat: 1,    gtilt: 0,  speed: 0.12, jitter: 0,   blinkS: 1,   mode: "follow" },
  happy:       { open: 0.92, topBend: 0.95, botBend: -0.55, tilt: 0,   pupil: 1.15, gaze: { x: 0, y: -0.08 },  glow: 1.25, hue: 6,    sat: 1.05, gtilt: 0,  speed: 0.16, jitter: 0,   blinkS: 1,   mode: "follow", enter: "bounce" },
  surprised:   { open: 1.35, topBend: 1.28, botBend: 1.28,  tilt: 0,   pupil: 0.5,  gaze: { x: 0, y: 0 },      glow: 1.5,  hue: 0,    sat: 1,    gtilt: 0,  speed: 0.3,  jitter: 0,   blinkS: 1.6, mode: "follow", enter: "pop" },
  sad:         { open: 0.8,  topBend: 0.72, botBend: 1.02,  tilt: -13, pupil: 1.22, gaze: { x: 0, y: 0.42 },   glow: 0.7,  hue: -14,  sat: 0.7,  gtilt: 0,  speed: 0.07, jitter: 0.7, blinkS: 1.3, mode: "follow" },
  angry:       { open: 0.6,  topBend: 0.55, botBend: 0.9,   tilt: 16,  pupil: 0.72, gaze: { x: 0, y: 0.02 },   glow: 1.35, hue: -150, sat: 1.2,  gtilt: 0,  speed: 0.18, jitter: 1.1, blinkS: 1.4, mode: "follow" },
  sleepy:      { open: 0.42, topBend: 0.9,  botBend: 1.0,   tilt: -6,  pupil: 1.0,  gaze: { x: 0, y: 0.3 },    glow: 0.55, hue: -8,   sat: 0.65, gtilt: 0,  speed: 0.06, jitter: 0,   blinkS: 2.4, mode: "follow" },
  love:        { open: 1.05, topBend: 1.0,  botBend: 0.5,   tilt: 0,   pupil: 1.5,  gaze: { x: 0, y: -0.08 },  glow: 1.35, hue: 150,  sat: 1.2,  gtilt: 0,  speed: 0.12, jitter: 0,   blinkS: 1,   mode: "follow", enter: "swoon" },
  wink:        { open: 0.92, topBend: 0.95, botBend: -0.45, tilt: 0,   pupil: 1.1,  gaze: { x: 0, y: 0 },      glow: 1.2,  hue: 6,    sat: 1.05, gtilt: 0,  speed: 0.18, jitter: 0,   blinkS: 1,   mode: "follow", enter: "wink" },

  // presence states
  idle:        { open: 1.0,  topBend: 0.94, botBend: 1.08,  tilt: 0,   pupil: 1.0,  gaze: { x: 0, y: 0 },      glow: 1.0,  hue: 0,    sat: 1,    gtilt: 0,  speed: 0.1,  jitter: 0,   blinkS: 1,   mode: "follow" },
  listening:   { open: 1.1,  topBend: 1.05, botBend: 1.02,  tilt: 0,   pupil: 1.05, gaze: { x: 0, y: -0.04 },  glow: 1.15, hue: 0,    sat: 1,    gtilt: 0,  speed: 0.14, jitter: 0,   blinkS: 0.8, mode: "lock",   enter: "pulse" },
  question:    { open: 1.02, topBend: 1.05, botBend: 1.0,   tilt: 0,   pupil: 1.05, gaze: { x: 0.12, y: -0.34 }, glow: 1.1, hue: 0,    sat: 1,    gtilt: 10, speed: 0.14, jitter: 0,   blinkS: 1.2, mode: "lock" },
  affirmative: { open: 0.95, topBend: 0.95, botBend: -0.3,  tilt: 0,   pupil: 1.1,  gaze: { x: 0, y: 0 },      glow: 1.3,  hue: 4,    sat: 1.05, gtilt: 0,  speed: 0.2,  jitter: 0,   blinkS: 1,   mode: "lock",   enter: "nod" },
  focused:     { open: 0.74, topBend: 0.7,  botBend: 0.85,  tilt: 4,   pupil: 0.78, gaze: { x: 0, y: -0.06 },  glow: 1.4,  hue: 0,    sat: 1.1,  gtilt: 0,  speed: 0.16, jitter: 0,   blinkS: 2.2, mode: "lock",   enter: "converge" },
  thinking:    { open: 0.9,  topBend: 0.92, botBend: 1.0,   tilt: 0,   pupil: 1.0,  gaze: { x: -0.3, y: -0.35 }, glow: 1.05, hue: 0,   sat: 1,    gtilt: 0,  speed: 0.09, jitter: 0,   blinkS: 1.6, mode: "wander" },
};
