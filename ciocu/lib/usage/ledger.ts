"use client";

// The usage ledger — on-device credit accounting. Records active STT-seconds, chat replies, and
// per-turn overhead, converts them to credits (see rates.ts), and drains the current period's
// allowance. Exposes the remaining balance and a voice-throttle decision for the UI.
//
// Persistence: its own tiny IndexedDB ("ciocu-usage"), kept separate from the memory DB so the two
// never fight over schema versions. A single "current" row holds this period's counters.
//
// SCOPE / TRUST: this is the client-side *mechanism* — it drives the meter and the voice→text
// throttle honestly. It is NOT tamper-proof (a user can edit IndexedDB), and the billing period
// here rolls over on the calendar month as a placeholder. Server-authoritative enforcement and
// alignment to the real Lemon Squeezy renewal date come when we add a session + subscription
// webhook. Until then: correct UX, best-effort accounting.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { useSyncExternalStore } from "react";
import {
  FREE_MESSAGE_LIMIT,
  TIER_ALLOWANCE,
  VOICE_THROTTLE_FLOOR,
  chatCredits,
  turnOverheadCredits,
  voiceCredits,
  type Tier,
} from "./rates";

interface UsageRecord {
  id: "current"; // singleton
  tier: Tier;
  periodStart: number; // epoch ms — when the current billing period began
  creditsUsed: number; // credits consumed this period (float)
  // raw running totals, kept for transparency / future analytics
  sttSeconds: number;
  chatMessages: number;
  turns: number;
  updatedAt: number;
}

export interface UsageSnapshot {
  tier: Tier;
  allowance: number; // credits granted this period
  used: number; // credits consumed (rounded to 1dp)
  remaining: number; // credits left (never negative)
  fractionUsed: number; // 0..1, for a meter
  voiceThrottled: boolean; // true → route voice to text-only
  freeMessagesLeft: number | null; // free tier: messages remaining this period; null when paid
  messageBlocked: boolean; // free tier hit its message cap → prompt to subscribe
  periodStart: number;
  raw: { sttSeconds: number; chatMessages: number; turns: number };
}

interface UsageDB extends DBSchema {
  usage: { key: string; value: UsageRecord };
}

// Free/unknown until /api/subscription reports a real tier (see page.tsx). setTier() then flips
// it to basic/pro for paying users.
const DEFAULT_TIER: Tier = "none";

let dbPromise: Promise<IDBPDatabase<UsageDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<UsageDB>("ciocu-usage", 1, {
      upgrade(d) {
        d.createObjectStore("usage", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

// Monthly buckets as a monotonic integer (year*12 + month), so "did the month change?" is ==.
function monthBucket(ts: number): number {
  const d = new Date(ts);
  return d.getFullYear() * 12 + d.getMonth();
}

function fresh(now: number): UsageRecord {
  return {
    id: "current",
    tier: DEFAULT_TIER,
    periodStart: now,
    creditsUsed: 0,
    sttSeconds: 0,
    chatMessages: 0,
    turns: 0,
    updatedAt: now,
  };
}

// Reset the period's counters when the calendar month rolls over, preserving the tier.
function rolledOver(rec: UsageRecord, now: number): UsageRecord {
  if (monthBucket(rec.periodStart) === monthBucket(now)) return rec;
  return { ...fresh(now), tier: rec.tier };
}

// ── In-memory cache + pub/sub, so a React meter can read synchronously (SSR-safe). ──
const listeners = new Set<() => void>();
let cache: UsageSnapshot | null = null;

function snapshotOf(rec: UsageRecord): UsageSnapshot {
  const allowance = TIER_ALLOWANCE[rec.tier];
  const usedRounded = Math.round(rec.creditsUsed * 10) / 10;
  const remaining = Math.max(0, allowance - rec.creditsUsed);
  const isFree = rec.tier === "none";
  return {
    tier: rec.tier,
    allowance,
    used: usedRounded,
    remaining: Math.round(remaining * 10) / 10,
    fractionUsed: allowance > 0 ? Math.min(1, rec.creditsUsed / allowance) : 1,
    voiceThrottled: isFree || remaining <= VOICE_THROTTLE_FLOOR,
    freeMessagesLeft: isFree ? Math.max(0, FREE_MESSAGE_LIMIT - rec.chatMessages) : null,
    messageBlocked: isFree && rec.chatMessages >= FREE_MESSAGE_LIMIT,
    periodStart: rec.periodStart,
    raw: { sttSeconds: rec.sttSeconds, chatMessages: rec.chatMessages, turns: rec.turns },
  };
}

function publish(rec: UsageRecord) {
  cache = snapshotOf(rec);
  listeners.forEach((l) => l());
}

/** Load the current record, applying month rollover; persist if anything changed. */
async function load(): Promise<UsageRecord> {
  const d = await db();
  const now = Date.now();
  const existing = await d.get("usage", "current");
  if (!existing) {
    const rec = fresh(now);
    await d.put("usage", rec);
    return rec;
  }
  const rolled = rolledOver(existing, now);
  if (rolled !== existing) await d.put("usage", rolled);
  return rolled;
}

/** Read-modify-write one atomic mutation, then publish the new snapshot. */
async function mutate(fn: (rec: UsageRecord) => void): Promise<UsageSnapshot> {
  const d = await db();
  const now = Date.now();
  const tx = d.transaction("usage", "readwrite");
  const store = tx.objectStore("usage");
  let rec = (await store.get("current")) ?? fresh(now);
  rec = rolledOver(rec, now);
  fn(rec);
  rec.updatedAt = now;
  await store.put(rec);
  await tx.done;
  publish(rec);
  return cache!;
}

// ── Public API ──────────────────────────────────────────────────────────────────

/** Current usage snapshot (loads + rolls over on first call). */
export async function getUsage(): Promise<UsageSnapshot> {
  const rec = await load();
  publish(rec);
  return cache!;
}

/**
 * Record a span of *active, streamed* speech-to-text. Call this with a batch of seconds
 * (e.g. flush every few seconds of live STT) — not per animation frame.
 */
export async function recordVoiceSeconds(seconds: number): Promise<UsageSnapshot> {
  return mutate((rec) => {
    if (seconds > 0) {
      rec.sttSeconds += seconds;
      rec.creditsUsed += voiceCredits(seconds);
    }
  });
}

/** Record `count` of Ciocu's chat replies (defaults to one). */
export async function recordChatMessage(count = 1): Promise<UsageSnapshot> {
  return mutate((rec) => {
    if (count > 0) {
      rec.chatMessages += count;
      rec.creditsUsed += chatCredits(count);
    }
  });
}

/** Record one turn's worth of background overhead (mood read + memory reflect). */
export async function recordTurn(count = 1): Promise<UsageSnapshot> {
  return mutate((rec) => {
    if (count > 0) {
      rec.turns += count;
      rec.creditsUsed += turnOverheadCredits(count);
    }
  });
}

/** Set the tier (later: called when a verified subscription is created/changed/cancelled). */
export async function setTier(tier: Tier): Promise<UsageSnapshot> {
  return mutate((rec) => {
    rec.tier = tier;
  });
}

/** True if there's budget to spend on voice right now; false → route to text. */
export async function canUseVoice(): Promise<boolean> {
  const u = await getUsage();
  return !u.voiceThrottled;
}

/** Force a new period (testing / manual reset). Keeps the tier. */
export async function resetPeriod(): Promise<UsageSnapshot> {
  return mutate((rec) => {
    const kept = rec.tier;
    Object.assign(rec, fresh(Date.now()), { tier: kept });
  });
}

// ── React hook ────────────────────────────────────────────────────────────────
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Kick a load on first subscription so the cache fills.
  if (cache === null) void getUsage();
  return () => listeners.delete(cb);
}

/** The live usage snapshot for a meter UI. Null until the first async load resolves. */
export function useUsage(): UsageSnapshot | null {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => null,
  );
}
