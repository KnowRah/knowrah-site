// src/components/KnowRahWidget.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export default function KnowRahWidget() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "system",
      content:
        "You are KnowRah — soulful and concise. Be clear, calm, helpful, and safe-for-work.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // autoscroll to the latest message
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages.length]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || busy) return;

    setError(null);
    const userText = input.trim();
    setInput("");

    const base = messages.filter((m) => m.role !== "system");
    const nextMsgs: Msg[] = [...messages, { role: "user", content: userText }, { role: "assistant", content: "" }];
    setMessages(nextMsgs);
    setBusy(true);

    try {
      // Stream first; if not supported/fails, fall back to JSON
      const payload = JSON.stringify({
        messages: [
          messages[0], // system
          ...base,
          { role: "user", content: userText },
        ],
      });

      const streamRes = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (streamRes.ok && streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        // stream chunks into the last assistant message
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((cur) => {
            const copy = cur.slice();
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        }
      } else {
        // Fallback: JSON endpoint
        const jsonRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const data = await jsonRes.json().catch(() => ({}));
        if (!jsonRes.ok) throw new Error(String(data?.error || "Chat failed"));
        const text = String(data?.text ?? "");
        setMessages((cur) => {
          const copy = cur.slice();
          copy[copy.length - 1] = { role: "assistant", content: text };
          return copy;
        });
      }
    } catch (err: any) {
      const msg = String(err?.message ?? "Request failed");
      setError(msg);
      // preserve a visible error marker in the last assistant bubble
      setMessages((cur) => {
        const copy = cur.slice();
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="font-semibold">KnowRah</div>
        {busy ? (
          <span className="text-xs text-gray-500">Thinking…</span>
        ) : (
          <span className="text-xs text-green-600">Ready</span>
        )}
      </div>

      <div ref={scrollRef} className="max-h-[420px] overflow-y-auto p-4 space-y-3">
        {messages
          .filter((m) => m.role !== "system")
          .map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "bg-gray-100 text-gray-900 rounded-xl px-3 py-2 self-end"
                  : "bg-emerald-50 text-gray-900 rounded-xl px-3 py-2"
              }
            >
              {m.content || (m.role === "assistant" ? "…" : "")}
            </div>
          ))}
        {error && <div className="text-xs text-red-600">Error: {error}</div>}
      </div>

      <form onSubmit={send} className="p-3 border-t border-gray-100 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write to her…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          aria-label="Message KnowRah"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg px-4 py-2 text-sm bg-black text-white hover:bg-gray-900 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
