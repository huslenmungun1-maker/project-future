"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";

type ChatMessage = {
  id: number;
  role: Role;
  text: string;
};

export function CoreAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text:
        "Hi, I’m your Core Assistant. Tell me what series or chapter you’re working on today and I’ll help you plan the next steps.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextIdRef = useRef(2);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const addMessage = (role: Role, text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextIdRef.current++, role, text },
    ]);
  };

  async function sendToBackend(history: ChatMessage[]) {
    const apiMessages = history.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    const res = await fetch("/api/core-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || "Core assistant API error");
    }

    const data = await res.json();
    return (data.reply as string) || "";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    setError(null);

    // add user message locally
    addMessage("user", trimmed);
    setInput("");
    setIsThinking(true);

    try {
      const reply = await sendToBackend([
        ...messages,
        { id: -1, role: "user", text: trimmed },
      ]);

      addMessage(
        "assistant",
        reply ||
          "I tried to answer but got an empty reply from the server."
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong talking to the core assistant.");
      addMessage(
        "assistant",
        "I couldn’t reach my brain (the API). Check the OPENAI_API_KEY and /api/core-assistant route."
      );
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const setQuickPrompt = (text: string) => {
    setInput(text);
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-slate-100">
      {/* header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/80 text-xs font-bold text-black">
            🧠
          </span>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold">Core Assistant</h2>
            <p className="text-[11px] text-slate-400">
              In-app AI manager for your manga / webnovel studio.
            </p>
          </div>
        </div>
        {isThinking && (
          <span className="text-[11px] text-emerald-300">Thinking…</span>
        )}
      </div>

      {/* quick actions */}
      <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
        <button
          type="button"
          onClick={() =>
            setQuickPrompt(
              "Give me 3 concrete tasks I can do in the next 30 minutes for my current series."
            )
          }
          className="rounded-full border border-slate-700 bg-black/40 px-3 py-1 hover:border-emerald-400 hover:text-emerald-200 transition"
        >
          30-min plan
        </button>
        <button
          type="button"
          onClick={() =>
            setQuickPrompt(
              "Help me outline the next chapter of my manga. Ask me questions first."
            )
          }
          className="rounded-full border border-slate-700 bg-black/40 px-3 py-1 hover:border-emerald-400 hover:text-emerald-200 transition"
        >
          Outline chapter
        </button>
        <button
          type="button"
          onClick={() =>
            setQuickPrompt(
              "Suggest 5 better title ideas and tag ideas for my series. I’ll paste my current title and description after this."
            )
          }
          className="rounded-full border border-slate-700 bg-black/40 px-3 py-1 hover:border-emerald-400 hover:text-emerald-200 transition"
        >
          Improve titles & tags
        </button>
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        className="mb-3 h-60 overflow-y-auto rounded-xl border border-slate-800 bg-black/30 p-3 text-[13px]"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-2 flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-emerald-500 text-black"
                  : "bg-slate-800 text-slate-100"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {messages.length === 0 && !isThinking && (
          <p className="text-[11px] text-slate-500">
            Start by telling me what you’re working on.
          </p>
        )}
      </div>

      {error && (
        <p className="mb-1 text-[11px] text-rose-300">⚠️ {error}</p>
      )}

      {/* input */}
      <form
        onSubmit={handleSubmit}
        className="mt-2 flex items-center gap-2 text-[11px]"
      >
        <input
          className="flex-1 rounded-xl border border-slate-700 bg-black/50 px-3 py-2 text-[11px] text-slate-100 outline-none focus:border-emerald-400"
          placeholder="Tell your assistant what you’re working on or ask for a plan…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isThinking ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
