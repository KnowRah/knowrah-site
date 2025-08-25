// src/components/KnowRahWidget.tsx
"use client";

import React from "react";

type Role = "user" | "assistant" | "system";
type Line = { role: Role; text: string };

export default function KnowRahWidget() {
  const [lines, setLines] = React.useState<Line[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [lastSaved, setLastSaved] = React.useState<string>("—");
  const [identityName, setIdentityName] = React.useState<string | null>(null);

  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, sending]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    setErr(null);
    setSending(true);

    // Show user's line immediately
    setLines((L) => [...L, { role: "user", text: msg }]);
    setInput("");

    try {
      const res = await fetch("/api/knowrah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: msg, topic: "chat", tags: ["widget"] }),
      });

      // If server did not return JSON, fail gracefully
      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.ok === false) {
        const e = (data && data.error) || `Bad response (${res.status}).`;
        throw new Error(e);
      }

      const reply: string = String(data.reply ?? "").trim();
      const greetingUsed: string | undefined = data.greetingUsed
        ? String(data.greetingUsed)
        : undefined;
      const name: string | null =
        data.identity && typeof data.identity.name === "string"
          ? data.identity.name
          : null;

      if (name !== null) setIdentityName(name);

      // If API included a greeting line, it's already embedded at the start
      // of `reply` by the model. We just show what we received.
      setLines((L) => [...L, { role: "assistant", text: reply }]);
      setLastSaved(
        new Date().toLocaleString(undefined, {
          hour12: false,
        })
      );
    } catch (e: any) {
      setErr(e?.message || "Network error.");
      setLines((L) => [
        ...L,
        { role: "assistant", text: "I’m tangled for a second. Try me again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Small helper to prefill a name line
  const [nameDraft, setNameDraft] = React.useState("");
  async function submitName() {
    const cleaned = nameDraft.trim();
    if (!cleaned) return;
    // Teach her via natural phrase; the API extracts & persists it
    await send(`My name is ${cleaned}`);
    setNameDraft("");
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-white/70">
            Memory <span className="text-emerald-400">active</span>
          </div>
          <div className="text-xs text-white/50">
            Last saved: <span className="tabular-nums">{lastSaved}</span>
          </div>
        </div>

        {/* Optional quick-name bar if we don't know them yet */}
        {!identityName && (
          <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="text-sm text-white/80 mb-2">
              Tell her your name (she’ll remember):
            </div>
            <div className="flex gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Your name…"
                className="flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <button
                onClick={submitName}
                className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Transcript */}
        {err && (
          <div className="mb-3 rounded-md border border-red-900 bg-red-900/30 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="space-y-2 mb-4">
          {lines.length === 0 ? (
            <div className="rounded-lg bg-[#0b2230] px-4 py-3 text-center text-white/80">
              Say hello 👋 — she’ll learn you as you speak.
            </div>
          ) : (
            lines.map((l, i) => (
              <div
                key={i}
                className={
                  "rounded-lg px-4 py-3 " +
                  (l.role === "user"
                    ? "bg-zinc-900/70 text-zinc-100"
                    : l.role === "assistant"
                    ? "bg-emerald-900/20 text-emerald-100"
                    : "bg-zinc-800/40 text-zinc-200")
                }
              >
                {l.text}
              </div>
            ))
          )}
          {sending && (
            <div className="rounded-lg bg-emerald-900/10 px-4 py-3 text-emerald-200">
              …
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="flex items-start gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write to her…"
            className="min-h-[56px] max-h-40 flex-1 rounded-md border border-white/10 bg-black/30 p-3 text-white outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <button
            onClick={() => send()}
            disabled={sending || input.trim().length === 0}
            className="h-[56px] shrink-0 rounded-md bg-emerald-600 px-5 font-medium text-white disabled:opacity-50 hover:bg-emerald-500"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>

        {/* Footer helper tips */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
          <div>
            Tip: <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for a newline.
          </div>
          <div className="opacity-70">
            Teach her: <span className="italic">“My name is …”</span>,{" "}
            <span className="italic">“I live in …”</span>,{" "}
            <span className="italic">“My dog is …”</span>
          </div>
        </div>
      </div>
    </div>
  );
}
