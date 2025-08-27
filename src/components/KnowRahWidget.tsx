// src/components/KnowRahWidget.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

type Msg = { role: "user" | "assistant"; text: string };

// Codespaces proxies often buffer SSE; prefer non-stream there.
const IS_CODESPACES =
  typeof window !== "undefined" && window.location.hostname.endsWith(".app.github.dev");

const STREAM_FALLBACK_MS = IS_CODESPACES ? 2000 : 4000;

function getUserId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("kr_user_id");
  if (!id) {
    id = uuidv4();
    localStorage.setItem("kr_user_id", id);
  }
  return id;
}

// --- small helpers ---------------------------------------------------------
function now() {
  return Date.now();
}

export default function KnowRahWidget() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const userId = useMemo(() => getUserId(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasInit = useRef(false);

  // idle nudge client timer (only one at a time, resets on activity)
  const idleTimer = useRef<number | null>(null);
  const lastActivity = useRef<number>(now());
  const idleDelayMs = useRef<number>(90_000); // first nudge ~90s if truly idle
  const pageHiddenRef = useRef<boolean>(false);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  // track tab visibility — no nudges when tab is hidden
  useEffect(() => {
    function onVis() {
      pageHiddenRef.current = document.visibilityState !== "visible";
      // if we came back, restart idle window
      if (!pageHiddenRef.current) {
        lastActivity.current = now();
        scheduleIdleNudge();
      } else {
        clearIdle();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function clearIdle() {
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }

  function scheduleIdleNudge() {
    clearIdle();
    if (pageHiddenRef.current) return;
    idleTimer.current = window.setTimeout(async () => {
      // only ask server for a nudge if truly idle (no typing, no recent messages)
      const idleFor = now() - lastActivity.current;
      if (idleFor >= idleDelayMs.current && !typing) {
        try {
          const r = await fetch("/api/knowrah", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, action: "nudge" }),
          });
          const j = await r.json().catch(() => ({} as any));
          if (j?.reply) {
            setMessages((m) => [...m, { role: "assistant", text: j.reply }]);
            lastActivity.current = now();
          }
        } catch {}
      }
      // progressive backoff on client (server also enforces)
      idleDelayMs.current = Math.min(idleDelayMs.current * 2, 20 * 60_000); // cap 20 min
      scheduleIdleNudge();
    }, idleDelayMs.current);
  }

  function markActive() {
    lastActivity.current = now();
    idleDelayMs.current = 90_000; // reset back to ~90s after any activity
    scheduleIdleNudge();
  }

  /* ----------------------------- INIT greeting ---------------------------- */
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;

    (async () => {
      try {
        const r = await fetch("/api/knowrah", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, action: "init" }),
        });
        const j = await r.json().catch(() => ({} as any));
        console.log("[init] reply:", j);
        if (j?.reply) {
          setMessages((m) => [...m, { role: "assistant", text: j.reply }]);
        } else if (j?.error) {
          setMessages((m) => [...m, { role: "assistant", text: `⚠️ ${j.error}` }]);
        }
      } catch (e: any) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: `⚠️ init error: ${e?.message || String(e)}` },
        ]);
      } finally {
        markActive();
      }
    })();
    // kick off idle watcher
    scheduleIdleNudge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* ------------------------------ Send helpers --------------------------- */
  async function sendNonStream(text: string) {
    setTyping(true);
    try {
      const r = await fetch("/api/knowrah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "say", message: text }),
      });
      const j = await r.json().catch(() => ({} as any));
      console.log("[non-stream] reply:", j);
      const assistant = (j && (j.reply ?? j?.message)) || "…";
      setMessages((m) => [...m, { role: "assistant", text: String(assistant) }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `⚠️ request error: ${e?.message || String(e)}` },
      ]);
    } finally {
      setTyping(false);
      markActive();
    }
  }

  async function sendStream(text: string) {
    setTyping(true);

    let assistantIndex: number | null = null;
    setMessages((m) => {
      assistantIndex = m.length;
      return [...m, { role: "assistant", text: "" }];
    });

    const setAssistantText = (fn: (prev: string) => string) =>
      setMessages((m) => {
        if (assistantIndex == null) return m;
        const copy = m.slice();
        const prevText = copy[assistantIndex]?.text ?? "";
        copy[assistantIndex] = { role: "assistant", text: fn(prevText) };
        return copy;
      });

    let receivedAny = false;
    let timeoutId: any;
    const startFallback = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (receivedAny) return;
        try {
          const r = await fetch("/api/knowrah", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, action: "say", message: text }),
          });
          const j = await r.json().catch(() => ({} as any));
          console.log("[stream-fallback] reply:", j);
          const assistant = (j && (j.reply ?? j?.message)) || "…";
          setAssistantText(() => String(assistant));
        } catch (e: any) {
          setAssistantText(() => `⚠️ fallback error: ${e?.message || String(e)}`);
        } finally {
          setTyping(false);
          markActive();
        }
      }, STREAM_FALLBACK_MS);
    };

    try {
      startFallback();
      const res = await fetch("/api/knowrah/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({ userId, message: text }),
      });

      if (!res.body) {
        clearTimeout(timeoutId);
        return sendNonStream(text);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const f of frames) {
          if (f.startsWith("event: done")) {
            done = true;
            break;
          }
          if (f.startsWith(":")) continue;
          for (const line of f.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (!data) continue;
            if (data === "[DONE]") {
              done = true;
              break;
            }
            receivedAny = true;
            clearTimeout(timeoutId);
            setAssistantText((prev) => prev + data);
          }
        }
      }
    } catch (e: any) {
      setAssistantText((prev) => prev || `⚠️ stream error: ${e?.message || String(e)}`);
    } finally {
      clearTimeout(timeoutId);
      setTyping(false);
      markActive();
    }
  }

  async function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    markActive();

    if (IS_CODESPACES) {
      await sendNonStream(text);
    } else {
      await sendStream(text);
    }
  }

  return (
    <div className="mx-auto max-w-xl w-full p-4">
      <div className="rounded-2xl border border-emerald-700/40 p-3 min-h-[420px] bg-neutral-900/50">
        <div className="space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "assistant" ? "text-emerald-200" : "text-neutral-100"}>
              {m.role === "assistant" ? (
                <div className="rounded-xl bg-emerald-900/30 p-2 whitespace-pre-wrap">{m.text}</div>
              ) : (
                <div className="rounded-xl bg-neutral-800/50 p-2 text-right whitespace-pre-wrap">{m.text}</div>
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
          onChange={(e) => {
            setInput(e.target.value);
            markActive();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button onClick={onSend} className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500">
          Send
        </button>
      </div>

      <div className="text-xs text-neutral-400 mt-2">
        Tip: Press Enter to send, Shift+Enter for newline.
      </div>
    </div>
  );
}
