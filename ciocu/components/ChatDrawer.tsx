"use client";

import { useEffect, useRef, useState } from "react";
import { ChatCircleDots, X, ArrowUp } from "@phosphor-icons/react";

export interface ChatMessage {
  role: "user" | "ciocu";
  text: string;
}

/**
 * Right-side text channel — default hidden, openable anytime. This is the direct-text way to
 * talk to Ciocu (the eyes/attention path comes in M2). Non-modal so the eyes stay visible while
 * you type. Boxy message bubbles are fine *here* (the caption stays bubble-free).
 */
export default function ChatDrawer({
  messages,
  onSend,
  open,
  onOpenChange,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  /** Controlled by the page, so other surfaces (e.g. menu → Support) can open the chat. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setOpen = onOpenChange;
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
  }

  return (
    <>
      <button
        type="button"
        className={`chat-tab${open ? " chat-tab--hidden" : ""}`}
        aria-label="Open chat with Ciocu"
        onClick={() => setOpen(true)}
      >
        <ChatCircleDots size={22} />
      </button>

      <aside className={`chat-drawer${open ? " chat-drawer--open" : ""}`} aria-hidden={!open}>
        <header className="chat-header">
          <span className="chat-title">Message Ciocu</span>
          <button type="button" className="icon-button" aria-label="Close chat" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </header>

        <div ref={listRef} className="chat-list">
          {messages.length === 0 ? (
            <p className="chat-empty">
              Ciocu listens here, and answers in writing above her eyes. Say something.
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`bubble bubble--${m.role}`}>
                {m.text}
              </div>
            ))
          )}
        </div>

        <form className="chat-input-row" onSubmit={submit}>
          <input
            ref={inputRef}
            className="chat-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write to Ciocu…"
            aria-label="Message to Ciocu"
          />
          <button type="submit" className="chat-send" aria-label="Send message" disabled={!value.trim()}>
            <ArrowUp size={20} weight="bold" />
          </button>
        </form>
      </aside>
    </>
  );
}
