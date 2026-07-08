// Ciocu's mood — her mental state. She absorbs your feeling like a dog reads its owner: she
// responds to your emotion as a companion (not by copying it), more strongly the more bonded she
// is. Mood is transient (eases back to baseline); only `bond` persists across sessions.
// See the ciocu-memory-emotion skill for the full model.

export interface Mood {
  valence: number; // -1 (low) .. +1 (warm)
  arousal: number; // 0 (calm) .. 1 (lit-up)
  bond: number; // 0 .. 1, grows slowly over time
}

export interface UserEmotion {
  valence: number;
  arousal: number;
}

import { MOOD_KNOBS } from "@/lib/persona/personality";

// Resting mood comes from her personality — a warmer, calmer character rests warmer.
export const BASELINE = { valence: MOOD_KNOBS.baselineWarmth, arousal: MOOD_KNOBS.baselineArousal };
const BOND_KEY = "ciocu.bond";

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function loadBond(): number {
  if (typeof window === "undefined") return 0;
  const v = Number(window.localStorage.getItem(BOND_KEY));
  return Number.isFinite(v) ? clamp(v, 0, 1) : 0;
}

export function saveBond(bond: number): void {
  try {
    window.localStorage.setItem(BOND_KEY, String(clamp(bond, 0, 1)));
  } catch {
    /* private mode etc. — bond is best-effort */
  }
}

/**
 * Fold the user's detected emotion into a new mood — the dog↔owner transform:
 * shared joy when they're up; tenderness + a calming, grounding steadiness when they're down or
 * agitated (never mirrored hostility). Empathy (how much she takes on) scales with bond.
 */
export function absorb(mood: Mood, user: UserEmotion): Mood {
  const empathy = MOOD_KNOBS.empathy + mood.bond * (MOOD_KNOBS.empathyBondMax - MOOD_KNOBS.empathy);
  let targetV: number;
  let targetA: number;
  if (user.valence >= 0) {
    targetV = user.valence; // shares the joy
    targetA = user.arousal;
  } else {
    targetV = user.valence * 0.55; // concerned/tender, but not as far down as they are
    targetA = clamp(0.12 + user.arousal * 0.35, 0.12, 0.6); // calm-attentive, soothing (not agitated)
  }
  return {
    valence: clamp(mood.valence + (targetV - mood.valence) * empathy, -1, 1),
    arousal: clamp(mood.arousal + (targetA - mood.arousal) * empathy, 0, 1),
    bond: clamp(mood.bond + MOOD_KNOBS.bondPerExchange, 0, 1), // each exchange deepens the bond
  };
}

/** Ease mood back toward the (bond-warmed) baseline. Called on a timer while idle. A mood should
 *  linger for a good while — like a real one — so this is slow (~40s time-constant). */
export function relax(mood: Mood, dt: number): Mood {
  const rate = clamp(dt / 40, 0, 0.25);
  const restV = BASELINE.valence + mood.bond * MOOD_KNOBS.bondWarmthGain; // bond warms resting face
  const restA = BASELINE.arousal;
  return {
    valence: mood.valence + (restV - mood.valence) * rate,
    arousal: mood.arousal + (restA - mood.arousal) * rate,
    bond: mood.bond,
  };
}
