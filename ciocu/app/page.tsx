"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EyeStage from "@/components/EyeStage";
import Caption from "@/components/Caption";
import Wordmark from "@/components/Wordmark";
import HamburgerMenu from "@/components/HamburgerMenu";
import GoogleAuth from "@/components/GoogleAuth";
import SettingsPanel from "@/components/SettingsPanel";
import PresenceControl, { type PresenceHandle } from "@/components/PresenceControl";
import Onboarding from "@/components/Onboarding";
import VersionBadge from "@/components/VersionBadge";
import PartnerBadge from "@/components/PartnerBadge";
import ChatDrawer, { type ChatMessage } from "@/components/ChatDrawer";
import type { EyeEngineHandle } from "@/lib/eyes/engine";
import { CIOCU_SYSTEM } from "@/lib/llm/persona";
import { appendMessage, getLatestThreadId, getThreadMessages, newId } from "@/lib/memory/store";
import { createVoice, type VoiceHandle } from "@/lib/voice/speech";
import { createSonioxVoice } from "@/lib/voice/soniox";
import { useVoicePrefs } from "@/lib/voice/prefs";
import { useGoogleUser } from "@/lib/auth/session";
import { absorb, BASELINE, loadBond, relax, saveBond, type Mood } from "@/lib/mood/mood";
import { formatMemories, recall } from "@/lib/memory/recall";
import { rememberExchange } from "@/lib/memory/reflect";
import { pullFromServer, schedulePush } from "@/lib/memory/sync";
import {
  recordChatMessage,
  recordKnowledgeQueries,
  recordTurn,
  recordVoiceSeconds,
  setSubscription,
  setTier,
  useUsage,
} from "@/lib/usage/ledger";
import type { Tier } from "@/lib/usage/rates";
import { getEnabledKnowledge } from "@/lib/knowledge/enabled";
import { billableCount, loadBases } from "@/lib/knowledge/bases";
import { ensureClusters } from "@/lib/memory/clusters";
import { SUB_UPDATED_EVENT } from "@/lib/billing/checkout";
import { DEFAULT_CAPTIONS, pickCaptions } from "@/lib/i18n/captions";

// Ciocu's caption lines default to English for SSR; the browser-language versions are applied on
// mount (see below) to avoid a hydration mismatch.

type LLMRole = "system" | "user" | "assistant";

export default function Home() {
  const engineRef = useRef<EyeEngineHandle | null>(null);
  const attendingRef = useRef(false);
  const generatingRef = useRef(false);
  const threadIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const voiceRef = useRef<VoiceHandle | null>(null);
  const sendRef = useRef<(text: string) => void>(() => {});
  const moodRef = useRef<Mood>({ valence: BASELINE.valence, arousal: BASELINE.arousal, bond: 0 });
  const presenceRef = useRef<PresenceHandle | null>(null);
  const captionsRef = useRef(DEFAULT_CAPTIONS);
  const usage = useUsage();
  const usageRef = useRef(usage);
  usageRef.current = usage;

  const [caption, setCaption] = useState(DEFAULT_CAPTIONS.greeting);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attending, setAttending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const user = useGoogleUser();
  // Read as primitives, so the voice effect re-runs on an actual change of choice rather than on
  // every re-render (the prefs object is a fresh reference each time).
  const { provider: voiceProvider, lang: voiceLang } = useVoicePrefs();

  // Localize Ciocu's caption lines to the browser language (client-only, so SSR stays English and
  // there's no hydration mismatch). Only swap the greeting if it's still the untouched default.
  useEffect(() => {
    const c = pickCaptions();
    captionsRef.current = c;
    setCaption((prev) => (prev === DEFAULT_CAPTIONS.greeting ? c.greeting : prev));
  }, []);

  const applyMessages = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const persist = useCallback(async (role: "user" | "ciocu", text: string) => {
    const threadId = threadIdRef.current;
    if (!threadId) return;
    try {
      await appendMessage({ id: newId(), threadId, role, text, ts: Date.now() });
    } catch {
      /* memory is best-effort; never block the conversation on it */
    }
  }, []);

  const pushMood = useCallback(() => {
    const m = moodRef.current;
    engineRef.current?.setMood(m.valence, m.arousal);
  }, []);

  // In-the-moment emotion read (parallel, non-blocking): she absorbs how you feel -> her eyes.
  const readMood = useCallback(
    async (mapped: { role: "user" | "assistant"; content: string }[]) => {
      try {
        const res = await fetch("/api/mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: mapped }),
        });
        if (!res.ok) return;
        const emotion = await res.json();
        // Her eyes well for YOU, not for herself — the dog↔owner rule keeps her own valence steady
        // on purpose, so this is what brings tears (see the engine).
        engineRef.current?.setEmpathy(emotion.valence ?? 0, emotion.arousal ?? 0);
        moodRef.current = absorb(moodRef.current, emotion);
        saveBond(moodRef.current.bond);
        pushMood();
      } catch {
        /* mood is best-effort */
      }
    },
    [pushMood],
  );

  // Load persisted bond; ease mood back to baseline over time and keep the eyes in sync.
  useEffect(() => {
    moodRef.current = { valence: BASELINE.valence, arousal: BASELINE.arousal, bond: loadBond() };
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      moodRef.current = relax(moodRef.current, dt);
      pushMood();
    }, 2000);
    return () => clearInterval(id);
  }, [pushMood]);

  // Load (or start) the persisted thread so the conversation survives reloads.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await pullFromServer(); // merge any synced memory before picking the latest thread
        const existing = await getLatestThreadId();
        const threadId = existing ?? newId();
        threadIdRef.current = threadId;
        if (existing) {
          const prior = await getThreadMessages(threadId);
          if (!cancelled && prior.length) {
            applyMessages(prior.map((m) => ({ role: m.role, text: m.text })));
          }
        }
        schedulePush(3000); // reconcile any local-only changes up to the server
        // Warm the memory clusters now (idempotent, and a no-op once assigned). Right after the
        // M4c→M4d upgrade — or an import — this re-clusters what's already stored, and doing it
        // here keeps that cost out of the first reply, where recall is capped at 2.5s.
        void ensureClusters();
      } catch {
        threadIdRef.current = newId();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMessages]);

  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || generatingRef.current) return;

      // Free plan: cap at FREE_MESSAGE_LIMIT exchanges, then nudge to subscribe.
      if (usageRef.current?.messageBlocked) {
        setCaption(captionsRef.current.freeLimit);
        setSettingsOpen(true);
        return;
      }
      generatingRef.current = true;

      const history: ChatMessage[] = [...messagesRef.current, { role: "user", text }];
      applyMessages(history);
      persist("user", text);
      engineRef.current?.setState("thinking");
      // meter the background overhead this turn incurs (mood read + memory reflect)
      void recordTurn();

      const mapped = history.slice(-24).map((m) => ({
        role: (m.role === "ciocu" ? "assistant" : "user") as LLMRole,
        content: m.text,
      }));

      // she feels how you feel, in parallel with composing her reply
      readMood(mapped as { role: "user" | "assistant"; content: string }[]);

      // recall what she remembers about them that's relevant to this message
      let memoryContext = "";
      try {
        // Don't let recall hold the reply hostage while the embed model cold-loads on a fresh
        // device — cap it. Once the model is warm (next messages), recall completes instantly.
        const recalled = await Promise.race([
          recall(text, moodRef.current),
          new Promise<never[]>((res) => setTimeout(() => res([]), 2500)),
        ]);
        memoryContext = formatMemories(recalled);
      } catch {
        /* recall is best-effort */
      }

      const llmMessages: { role: LLMRole; content: string }[] = [
        { role: "system", content: CIOCU_SYSTEM },
        ...(memoryContext ? [{ role: "system" as LLMRole, content: memoryContext }] : []),
        ...mapped,
      ];

      // placeholder bubble that fills in as tokens stream into the drawer
      applyMessages([...history, { role: "ciocu", text: "" }]);

      let reply = "";
      const activeKnowledge = getEnabledKnowledge();
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Her mood goes with it: the emotion layer drove only her eyes, so her words had no idea
          // she was feeling anything — which is exactly why she read as caring-in-theory only.
          body: JSON.stringify({
            messages: llmMessages,
            knowledge: activeKnowledge,
            mood: moodRef.current,
          }),
        });
        if (!res.ok || !res.body) throw new Error("bad response");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          reply += decoder.decode(value, { stream: true });
          const next = [...messagesRef.current];
          next[next.length - 1] = { role: "ciocu", text: reply };
          applyMessages(next);
        }

        reply = reply.trim() || "…";
        const finalized = [...messagesRef.current];
        finalized[finalized.length - 1] = { role: "ciocu", text: reply };
        applyMessages(finalized);
        setCaption(reply); // her line appears beside her eyes with the word-by-word reveal
        persist("ciocu", reply);
        void recordChatMessage(); // meter her reply against the monthly allowance
        // Meter only the bases that cost energy — the support base is free to consult.
        if (activeKnowledge.length) {
          void loadBases().then((bases) => {
            const billable = billableCount(activeKnowledge, bases);
            if (billable > 0) void recordKnowledgeQueries(billable);
          });
        }
        if (!attendingRef.current) engineRef.current?.setState("neutral");
        else engineRef.current?.setState("listening");
        // remember this exchange in the background: extract durable memories -> embed -> store.
        // Only the latest turn (not the whole history) so we don't re-extract past turns.
        void rememberExchange(
          [
            { role: "user", content: text },
            { role: "assistant", content: reply },
          ],
          moodRef.current,
          threadIdRef.current ?? "",
        );
        schedulePush(); // sync this exchange across devices (debounced; no-op if not eligible)
      } catch {
        const errored = [...messagesRef.current];
        errored[errored.length - 1] = { role: "ciocu", text: captionsRef.current.error };
        applyMessages(errored);
        setCaption(captionsRef.current.error);
        engineRef.current?.setState("neutral");
      } finally {
        generatingRef.current = false;
      }
    },
    [applyMessages, persist, readMood],
  );
  sendRef.current = sendMessage;

  // Reflect the real plan into the usage meter: read the tier from Lemon Squeezy (via the session)
  // whenever the user signs in / the tab regains focus (so it updates after paying in the LS tab).
  useEffect(() => {
    if (!user) {
      void setTier("none");
      return;
    }
    let cancelled = false;
    const sync = async () => {
      try {
        const res = await fetch("/api/subscription");
        if (!res.ok) return;
        const info = (await res.json()) as {
          tier?: Tier;
          renewsAt?: number | null;
          topupCredits?: number;
        };
        if (!cancelled && info.tier) {
          void setSubscription({
            tier: info.tier,
            renewsAt: info.renewsAt ?? null,
            topupCredits: info.topupCredits ?? 0,
          });
        }
      } catch {
        /* best-effort; meter falls back to its stored tier */
      }
    };
    void sync();
    window.addEventListener("focus", sync);
    window.addEventListener(SUB_UPDATED_EVENT, sync); // fires right after a successful checkout
    return () => {
      cancelled = true;
      window.removeEventListener("focus", sync);
      window.removeEventListener(SUB_UPDATED_EVENT, sync);
    };
  }, [user]);

  // Voice input, driven by attention below. Everyone gets free Web Speech; a signed-in paying user
  // is upgraded to Soniox unless they've chosen Google in Settings (server still gates Soniox in
  // /api/stt-token, so the local preference can't grant anything — see soniox.ts).
  useEffect(() => {
    let cancelled = false;
    // Google needs to be told the language; "" means follow the browser. Soniox ignores this.
    const web = createVoice({ lang: voiceLang || undefined, onFinal: (t) => sendRef.current(t) });
    voiceRef.current = web;
    if (attendingRef.current && web.supported) web.start();

    let soniox: VoiceHandle | null = null;
    if (user && voiceProvider === "soniox") {
      (async () => {
        const s = await createSonioxVoice({
          onFinal: (t) => sendRef.current(t),
          onProcessedMs: (ms) => {
            void recordVoiceSeconds(ms / 1000); // meter exactly the audio Soniox processed
          },
        });
        if (cancelled || !s) {
          s?.stop();
          return; // not entitled (or setup failed) → stay on free Web Speech
        }
        soniox = s;
        web.stop();
        voiceRef.current = s;
        if (attendingRef.current) s.start();
      })();
    }

    return () => {
      cancelled = true;
      web.stop();
      soniox?.stop();
    };
  }, [user, voiceProvider, voiceLang]);

  // Eye contact drives presence AND gates voice: she only listens (mic) while she sees you.
  const handleAttention = useCallback((next: boolean) => {
    attendingRef.current = next;
    setAttending(next);
    if (!generatingRef.current) engineRef.current?.setState(next ? "listening" : "idle");
  }, []);
  const handleVoice = useCallback((level: number) => {
    engineRef.current?.setVoiceLevel(level);
  }, []);
  // Her eyes follow where you actually are, not the mouse — presence is the whole point.
  const handleGaze = useCallback((x: number, y: number) => {
    engineRef.current?.setGaze(x, y);
  }, []);
  const readEyeDebug = useCallback(() => engineRef.current?.getDebug() ?? null, []);

  useEffect(() => {
    const v = voiceRef.current;
    if (!v?.supported) return;
    if (attending) v.start();
    else v.stop();
  }, [attending]);

  return (
    <main className="stage">
      <header className="topbar">
        <div className="topbar-left">
          <HamburgerMenu
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenChat={() => setChatOpen(true)}
          />
          <GoogleAuth />
        </div>
        <div className="topbar-center">
          <Wordmark />
        </div>
        <div className="topbar-right">
          <PresenceControl
            ref={presenceRef}
            onAttention={handleAttention}
            onVoice={handleVoice}
            onGaze={handleGaze}
            getEyeDebug={readEyeDebug}
          />
        </div>
      </header>

      <EyeStage onReady={(h) => (engineRef.current = h)} />

      <div className="caption-band">
        <Caption text={caption} />
      </div>

      <VersionBadge />
      <PartnerBadge />
      <ChatDrawer messages={messages} onSend={sendMessage} open={chatOpen} onOpenChange={setChatOpen} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Onboarding onEnable={() => presenceRef.current?.enable()} />
    </main>
  );
}
