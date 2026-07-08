"use client";

import { useCallback, useRef, useState } from "react";
import EyeStage from "@/components/EyeStage";
import Caption from "@/components/Caption";
import Wordmark from "@/components/Wordmark";
import HamburgerMenu from "@/components/HamburgerMenu";
import ChatDrawer, { type ChatMessage } from "@/components/ChatDrawer";
import type { EyeEngineHandle } from "@/lib/eyes/engine";
import type { StateName } from "@/lib/eyes/presets";

const GREETING = "I'm here. Look into my eyes when you want to talk.";

// M1 mock: stands in for the LLM (arrives in M3). Picks a reply + an eye state from keywords so
// the whole interaction shape — you write, Ciocu reacts in text and in her eyes — is testable now.
function mockReact(input: string): { reply: string; state: StateName } {
  const t = input.toLowerCase();
  if (/\b(hi|hello|hey|hallo|szia)\b/.test(t)) return { reply: "Hello. It's good to see you.", state: "happy" };
  if (t.includes("?")) return { reply: "Let me think about that with you.", state: "thinking" };
  if (/\b(love|thank|thanks)\b/.test(t)) return { reply: "That warms me.", state: "love" };
  if (/\b(sad|tired|hard|stress)\b/.test(t)) return { reply: "I'm listening. Take your time.", state: "listening" };
  if (/\b(remember|memory|recall)\b/.test(t)) return { reply: "I'll keep this. Your memory stays yours.", state: "affirmative" };
  return { reply: "I hear you.", state: "listening" };
}

export default function Home() {
  const engineRef = useRef<EyeEngineHandle | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [caption, setCaption] = useState(GREETING);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSend = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "user", text }]);
    const { reply, state } = mockReact(text);
    engineRef.current?.setState(state);
    setCaption(reply);
    setMessages((prev) => [...prev, { role: "ciocu", text: reply }]);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => engineRef.current?.setState("neutral"), 4500);
  }, []);

  return (
    <main className="stage">
      <EyeStage onReady={(h) => (engineRef.current = h)} />

      <header className="topbar">
        <div className="topbar-left">
          <HamburgerMenu />
        </div>
        <div className="topbar-center">
          <Wordmark />
        </div>
        <div className="topbar-right" />
      </header>

      <div className="caption-band">
        <Caption text={caption} />
      </div>

      <ChatDrawer messages={messages} onSend={handleSend} />
    </main>
  );
}
