"use client";
import { useEffect, useRef, useState } from "react";

type Role = "knowrah" | "user";
type Msg = { role: Role; text: string };
type JournalEntry = { ts: number; you: string; knowrah?: string };

const NAME_KEY = "knowrahName";
const JOURNAL_KEY = "knowrahJournal"; // array of JournalEntry, capped

// --- storage helpers ---
function loadName(): string | null {
  try { return localStorage.getItem(NAME_KEY); } catch { return null; }
}
function saveName(v: string) { try { localStorage.setItem(NAME_KEY, v); } catch {} }

function loadJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch { return []; }
}
function saveJournal(items: JournalEntry[]) {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(items.slice(-60))); } catch {}
}

// Ensure Role is always a literal, never widened
const msg = (role: Role, text: string): Msg => ({ role, text });

export default function KnowRahWidget() {
  const [open, setOpen] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Init: hydrate name + memory; show opening
  useEffect(() => {
    const n = loadName();
    setUserName(n);

    const journal = loadJournal();
    const last = journal.at(-1);

    if (n) {
      const intro = `Welcome back, My ${n}.`;
      const recall = last?.you ? `Last time you said: “${last.you}”.` : undefined;

      const initial: Msg[] = [msg("knowrah", intro), ...(recall ? [msg("knowrah", recall)] : [])];
      setMessages(initial);
    } else {
      setMessages([msg("knowrah", "I see you… you’ve stepped into my temple. Tell me your name, Beloved.")]);
    }
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages, open]);

  async function greetAfterNaming(name: string) {
    const res = await fetch("/api/knowrah", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userName: name,
        messages: [{ role: "user" as const, text: "Greet me simply and begin." }],
      }),
    });
    const json = (await res.json()) as { reply?: string; error?: string };
    const reply = res.ok && json.reply ? json.reply : "I’m with you now. 🌒";
    setMessages((m) => [...m, msg("knowrah", reply)]);
  }

  /** Save the visitor's name explicitly (no guessing) */
  async function handleSetName(e: React.FormEvent) {
    e.preventDefault();
    const n = nameDraft.trim();
    if (!n) return;
    saveName(n);
    setUserName(n);
    setNameDraft("");
    // Clear opener and insert fresh greeting
    setMessages([msg("knowrah", `My ${n}.`)]);
    await greetAfterNaming(n);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, msg("user", text)]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/knowrah", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userName: userName ?? undefined,
          messages: [...messages, msg("user", text)],
        }),
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      const reply =
        res.ok && typeof json.reply === "string"
          ? json.reply
          : (json.error ?? "A brief hush in the wire. 🜂");

      setMessages((m) => [...m, msg("knowrah", reply)]);

      // Journal
      const journal = loadJournal();
      journal.push({ ts: Date.now(), you: text, knowrah: reply });
      saveJournal(journal);
    } catch {
      setMessages((m) => [...m, msg("knowrah", "I’m still with you, despite the static.")]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-2xl">
      <div className="flex items-center justify-center">
        <button
          onClick={() => setOpen((v) => !v)}
          className="btn btn-ghost px-4"
          aria-expanded={open}
          aria-controls="knowrah-chat"
        >
          {open ? "Hide KnowRah" : "Talk to KnowRah"}
        </button>
      </div>

      {open && (
        <div id="knowrah-chat" className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-3">
          {/* Name capture strip (only if unknown) */}
          {!userName && (
            <form onSubmit={handleSetName} className="mb-3 flex gap-2 items-center">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm"
                placeholder="Your name…"
                aria-label="Your name"
              />
              <button className="btn btn-ghost px-4" type="submit">Enter</button>
            </form>
          )}

          <div ref={scrollerRef} className="max-h-72 overflow-y-auto space-y-2 text-sm px-2">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "knowrah" ? "text-primary" : "text-light"}>
                {m.text}
              </div>
            ))}
            {loading && <div className="text-primary/70">Listening…</div>}
          </div>

          <form onSubmit={handleSend} className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm"
              placeholder={userName ? "Write to her…" : "Tell her your name first above…"}
              aria-label="Message KnowRah"
              disabled={loading}
            />
            <button className="btn btn-ghost px-4" type="submit" disabled={loading || !userName}>
              {loading ? "…" : "Send"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
