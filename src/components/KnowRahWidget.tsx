// src/components/KnowRahWidget.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

type Msg = { role: "user" | "assistant"; text: string };

function getUserId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("kr_user_id");
  if (!id) {
    id = uuidv4();
    localStorage.setItem("kr_user_id", id);
  }
  return id;
}

export default function KnowRahWidget() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [typing, setTyping] = useState(false);
  const userId = useMemo(() => getUserId(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasInit = useRef(false);

  // INIT (guard Strict Mode double-call)
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;
    fetch("/api/knowrah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "init" }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.reply) setMessages((m) => [...m, { role: "assistant", text: j.reply }]);
      })
      .catch(() => {});
  }, [userId]);

  // Gentle idle nudges (server decides if/when to speak)
  useEffect(() => {
    const t = setInterval(() => {
      fetch("/api/knowrah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "nudge" }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j?.reply) setMessages((m) => [...m, { role: "assistant", text: j.reply }]);
        })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(t);
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setTyping(true);

    try {
      const res = await fetch("/api/knowrah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "say", message: text }),
      });
      const j = await res.json();
      if (j?.reply) setMessages((m) => [...m, { role: "assistant", text: j.reply }]);
    } finally {
      setTyping(false);
    }
  }

  async function saveName() {
    const nm = name.trim();
    if (!nm) return;
    const res = await fetch("/api/knowrah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "learn_identity", name: nm }),
    });
    const j = await res.json();
    if (j?.reply) setMessages((m) => [...m, { role: "assistant", text: j.reply }]);
  }

  return (
    <div className="mx-auto max-w-xl w-full p-4">
      <div className="mb-3 rounded-xl border border-emerald-500/30 bg-black/30 p-3">
        <div className="text-emerald-300 text-sm mb-2">
          Memory <span className="text-emerald-500">active</span>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-emerald-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Tell her your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            onClick={saveName}
            className="rounded bg-emerald-600 px-3 py-2 text-sm hover:bg-emerald-500"
          >
            Save
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-700/40 p-3 min-h-[420px] bg-neutral-900/50">
        <div className="space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "assistant" ? "text-emerald-200" : "text-neutral-100"}>
              {m.role === "assistant" ? (
                <div className="rounded-xl bg-emerald-900/30 p-2">{m.text}</div>
              ) : (
                <div className="rounded-xl bg-neutral-800/50 p-2 text-right">{m.text}</div>
              )}
            </div>
          ))}
          {typing && (
            <div className="text-emerald-200">
              <div className="rounded-xl bg-emerald-900/30 p-2">…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded border border-emerald-700 bg-transparent px-3 py-2"
          placeholder="Write to her..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500">
          Send
        </button>
      </div>

      <div className="text-xs text-neutral-400 mt-2">
        Tip: Press Enter to send, Shift+Enter for newline.
      </div>
    </div>
  );
}
