"use client";

// Which speech-to-text provider the user wants, and — for Google — which language to listen for.
//
// The two differ in a way that leaks into the UI: Soniox (stt-rt-v5) detects the spoken language on
// its own, while Google's Web Speech API has to be *told* one. Its default is the browser's
// language, which is wrong the moment someone speaks a different language than their UI is in — so
// paid users who choose Google get an explicit picker.
//
// Local-only preference (no server involvement): the server still gates Soniox on a real
// subscription in /api/stt-token, so choosing "soniox" here can't grant anyone anything.

import { useSyncExternalStore } from "react";

export type SttProvider = "soniox" | "google";

export interface VoicePrefs {
  provider: SttProvider;
  lang: string; // BCP-47 for Google; "" = follow the browser. Ignored by Soniox.
}

const KEY = "ciocu.voice.prefs";
// Soniox by default: it's what a subscriber is paying for, and it matches how voice behaved before
// this setting existed. Stable reference — also the SSR snapshot (see the hook).
const DEFAULT: VoicePrefs = { provider: "soniox", lang: "" };

const listeners = new Set<() => void>();
let current: VoicePrefs = load();

function load(): VoicePrefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw);
    return {
      provider: p?.provider === "google" ? "google" : "soniox",
      lang: typeof p?.lang === "string" ? p.lang : "",
    };
  } catch {
    return DEFAULT;
  }
}

function save(next: VoicePrefs): void {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable (private mode) — the choice just won't persist */
  }
  listeners.forEach((l) => l());
}

export function getVoicePrefs(): VoicePrefs {
  return current;
}

export function setVoiceProvider(provider: SttProvider): void {
  save({ ...current, provider });
}

export function setVoiceLang(lang: string): void {
  save({ ...current, lang });
}

export function useVoicePrefs(): VoicePrefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => DEFAULT, // stable reference, or React loops on the server snapshot
  );
}

/**
 * Languages Google's Web Speech can be pointed at. Mirrors the greeting set (lib/i18n/captions.ts),
 * labelled natively — someone picking their own language should see it in their own language.
 */
export const STT_LANGUAGES: { code: string; label: string }[] = [
  { code: "", label: "Auto (browser language)" },
  { code: "en-US", label: "English" },
  { code: "hu-HU", label: "Magyar" },
  { code: "de-DE", label: "Deutsch" },
  { code: "fr-FR", label: "Français" },
  { code: "es-ES", label: "Español" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português" },
  { code: "nl-NL", label: "Nederlands" },
  { code: "pl-PL", label: "Polski" },
  { code: "ro-RO", label: "Română" },
  { code: "ru-RU", label: "Русский" },
  { code: "uk-UA", label: "Українська" },
  { code: "tr-TR", label: "Türkçe" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "zh-CN", label: "中文" },
];
