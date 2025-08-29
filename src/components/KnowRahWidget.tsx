// src/components/KnowRahWidget.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

/* -------------------------------------------------------------------------- */
/* Types & constants                                                          */
/* -------------------------------------------------------------------------- */

type VoicePrefs = { enabled: boolean; voiceName: string | null; rate: number }; // kept for settings API (rate unused here)
type Msg = { role: "user" | "assistant"; text: string };

// Codespaces proxies often buffer SSE; prefer non-stream there.
const IS_CODESPACES =
  typeof window !== "undefined" && window.location.hostname.endsWith(".app.github.dev");

const STREAM_FALLBACK_MS = IS_CODESPACES ? 2000 : 4000;

/* -------------------------------------------------------------------------- */
/* Identity & time helpers                                                    */
/* -------------------------------------------------------------------------- */

function getUserId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("kr_user_id");
  if (!id) {
    id = uuidv4();
    localStorage.setItem("kr_user_id", id);
  }
  return id;
}

function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
function now() {
  return Date.now();
}

/* -------------------------------------------------------------------------- */
/* Voice prefs                                                                */
/* -------------------------------------------------------------------------- */

const VOICE_KEY = "knowrah.voice.prefs";
function loadVoicePrefs(): VoicePrefs {
  if (typeof window === "undefined") return { enabled: true, voiceName: null, rate: 1 };
  try {
    const raw = localStorage.getItem(VOICE_KEY);
    return raw ? JSON.parse(raw) : { enabled: true, voiceName: null, rate: 1 };
  } catch {
    return { enabled: true, voiceName: null, rate: 1 };
  }
}
function saveVoicePrefs(p: VoicePrefs) {
  try {
    localStorage.setItem(VOICE_KEY, JSON.stringify(p));
  } catch {}
}

/* -------------------------------------------------------------------------- */
/* Speech text shaping (emoji stripping + sacred cadence)                     */
/* -------------------------------------------------------------------------- */

// helper to strip emojis before speaking (keeps them in UI)
function stripEmojis(text: string): string {
  return text.replace(
    /([\u2700-\u27BF]|\uFE0F|[\u2600-\u26FF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g,
    ""
  );
}

/** Adds gentle pauses and subtle “breath” so the delivery feels priestess-like. */
function ritualize(raw: string): string {
  let t = stripEmojis(raw);

  // normalize whitespace + unify ellipses
  t = t.replace(/\.\.\./g, "…");
  t = t.replace(/\s+/g, " ").trim();

  // short pause after commas (unless already followed by a pause)
  t = t.replace(/,\s(?!…)/g, ", … ");

  // em dash -> longer breath
  t = t.replace(/—/g, " — … ");

  // soften run-ons: add a short pause after semicolons/colons
  t = t.replace(/;\s(?!…)/g, "; … ");
  t = t.replace(/:\s(?!…)/g, ": … ");

  // if it ends abruptly with a word, add a soft final breath
  if (!/[.!?…]$/.test(t)) t = t + "…";

  return t;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function KnowRahWidget() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const userId = useMemo(() => getUserId(), []);
  const timeZone = useMemo(() => getLocalTimeZone(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasInit = useRef(false);

  // idle nudge client timer (only one at a time, resets on activity)
  const idleTimer = useRef<number | null>(null);
  const lastActivity = useRef<number>(now());
  const idleDelayMs = useRef<number>(90_000); // first nudge ~90s if truly idle
  const pageHiddenRef = useRef<boolean>(false);

  // mount gate to avoid hydration mismatches
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      const idleFor = now() - lastActivity.current;
      if (idleFor >= idleDelayMs.current && !typing) {
        try {
          const r = await fetch("/api/knowrah", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, action: "nudge", timezone: timeZone }),
          });
          const j = await r.json().catch(() => ({} as any));
          if (j?.reply) {
            setMessages((m) => [...m, { role: "assistant", text: j.reply }]);
            lastActivity.current = now();
          }
        } catch {}
      }
      idleDelayMs.current = Math.min(idleDelayMs.current * 2, 20 * 60_000); // cap 20 min
      scheduleIdleNudge();
    }, idleDelayMs.current);
  }

  function markActive() {
    lastActivity.current = now();
    idleDelayMs.current = 90_000;
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
          body: JSON.stringify({ userId, action: "init", timezone: timeZone }),
        });
        const j = await r.json().catch(() => ({} as any));
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

    scheduleIdleNudge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, timeZone]);

  /* ------------------------------ Send helpers --------------------------- */
  async function sendNonStream(text: string) {
    setTyping(true);
    try {
      const r = await fetch("/api/knowrah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "say", message: text, timezone: timeZone }),
      });
      const j = await r.json().catch(() => ({} as any));
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
            body: JSON.stringify({ userId, action: "say", message: text, timezone: timeZone }),
          });
          const j = await r.json().catch(() => ({} as any));
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
        body: JSON.stringify({ userId, message: text, timezone: timeZone }),
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

  /* ---------------------------- OpenAI Voice Only ------------------------- */

  const [speaking, setSpeaking] = useState(false);
  const [voicePrefs, setVoicePrefs] = useState<VoicePrefs>(() => loadVoicePrefs());

  // OpenAI voice choice (names like "alloy", "verse", "aria"; default alloy)
  const [openaiVoice, setOpenaiVoice] = useState<string>(() => {
    if (typeof window === "undefined") return "alloy";
    return localStorage.getItem("kr_openai_voice") || "alloy";
  });
  function saveOpenAIVoice(v: string) {
    try {
      localStorage.setItem("kr_openai_voice", v);
    } catch {}
    setOpenaiVoice(v);
  }

  // Autoplay unlock for production (Vercel) due to browser policy
  const [interacted, setInteracted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("kr_voice_unlocked") === "1";
  });
  useEffect(() => {
    if (interacted) return;
    function unlock() {
      setInteracted(true);
      try {
        localStorage.setItem("kr_voice_unlocked", "1");
      } catch {}
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock as any);
      window.removeEventListener("keydown", unlock as any);
      window.removeEventListener("touchstart", unlock as any);
    };
  }, [interacted]);

  // collect the last assistant message for auto-speak
  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m) continue;
      if (m.role === "assistant") return m.text;
    }
    return null;
  }, [messages]);

  // lip-sync mouth state (timed pulses during audio)
  const [mouthOpen, setMouthOpen] = useState(0); // 0..1
  const decayTimer = useRef<number | null>(null);
  function bumpMouth() {
    setMouthOpen(1);
    if (decayTimer.current) window.clearInterval(decayTimer.current);
    decayTimer.current = window.setInterval(() => {
      setMouthOpen((v) => {
        const next = Math.max(0, v - 0.2);
        if (next === 0 && decayTimer.current) {
          window.clearInterval(decayTimer.current);
          decayTimer.current = null;
        }
        return next;
      });
    }, 60);
  }

  // Hidden audio element for OpenAI playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!audioRef.current) return;
    const a = audioRef.current;

    const onPlay = () => {
      setSpeaking(true);
      // gentle timed pulses during OpenAI playback
      bumpMouth();
      if (decayTimer.current) {
        window.clearInterval(decayTimer.current);
        decayTimer.current = null;
      }
      decayTimer.current = window.setInterval(() => bumpMouth(), 180);
    };
    const onEnded = () => {
      setSpeaking(false);
      setMouthOpen(0);
      if (decayTimer.current) {
        window.clearInterval(decayTimer.current);
        decayTimer.current = null;
      }
    };
    const onError = () => {
      setSpeaking(false);
      setMouthOpen(0);
      if (decayTimer.current) {
        window.clearInterval(decayTimer.current);
        decayTimer.current = null;
      }
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, []);

  // speak via OpenAI (fetch audio from our API and play)
  async function speakWithOpenAI(rawText: string) {
    const text = ritualize(rawText);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: openaiVoice, // e.g. "alloy"
          format: "mp3",
          stripEmojis: false, // already handled in ritualize
        }),
      });
      if (!res.ok) {
        console.error("voice api error", await res.text().catch(() => ""));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const audio = audioRef.current || new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.play().catch(() => {
        // Autoplay might require interaction; the unlock button is visible until interacted
      });
    } catch (e) {
      console.error("openai tts error", e);
    }
  }

  // Auto-speak when new assistant text arrives (only after user interaction)
  useEffect(() => {
    if (!voicePrefs.enabled || !lastAssistant || !interacted) return;
    if (!lastAssistant.trim()) return;
    speakWithOpenAI(lastAssistant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAssistant, voicePrefs.enabled, interacted, openaiVoice]);

  function setPrefs(p: Partial<VoicePrefs>) {
    const next = { ...voicePrefs, ...p };
    setVoicePrefs(next);
    saveVoicePrefs(next);

    if (p.enabled === false && typeof window !== "undefined") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setSpeaking(false);
      setMouthOpen(0);
      if (decayTimer.current) {
        window.clearInterval(decayTimer.current);
        decayTimer.current = null;
      }
    }
  }

  /* ------------------------------- UI ------------------------------------ */

  return (
    <div className="mx-auto w-full max-w-xl p-4 pt-[env(safe-area-inset-top)]">
      {/* header with avatar + priestess controls */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* ★ Priestess avatar */}
          <div
            className={[
              "relative w-16 h-16 rounded-full grid place-items-center overflow-hidden",
              "border border-emerald-300/30 bg-neutral-900",
              speaking
                ? "shadow-[0_0_90px_12px_rgba(16,185,129,0.35)] animate-kr-aura"
                : "shadow-[0_0_50px_8px_rgba(16,185,129,0.18)]",
            ].join(" ")}
            title={speaking ? "Speaking" : "Listening"}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.35),transparent_60%)]" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="kr-smoke kr-smoke-1" />
              <div className="kr-smoke kr-smoke-2" />
            </div>
            <div className="relative z-[1]">
              <span className="text-2xl select-none">🜂</span>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-full kr-glyph-ring">
              <div className="absolute inset-[2px] rounded-full border border-emerald-500/15" />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-emerald-300/50 tracking-[0.2em]">
                <span className="kr-glyph-text">🌒 🜂 🧬 ∞ 🌒 🜂 🧬 ∞</span>
              </div>
            </div>
            {/* lip-sync mouth */}
            <div
              className="absolute left-1/2 bottom-2 -translate-x-1/2 origin-bottom w-8 h-2 rounded-full bg-emerald-200/25"
              style={{
                transform: `translateX(-50%) scaleY(${0.25 + mouthOpen * 0.9})`,
                transition: "transform 60ms linear",
                boxShadow: mouthOpen > 0.4 ? "0 0 10px rgba(16,185,129,0.35)" : "none",
              }}
              aria-hidden
            />
          </div>

          <div>
            <div className="text-emerald-300 font-medium">Priestess KnowRah</div>
            <div className="text-emerald-200/70 text-xs">Presence Online</div>
          </div>
        </div>

        {/* Controls: streamlined for OpenAI voice only */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-emerald-300/90 w-full sm:w-auto">
          <label className="flex items-center gap-1 select-none">
            <input
              type="checkbox"
              className="size-4 accent-emerald-400"
              checked={voicePrefs.enabled}
              onChange={(e) => setPrefs({ enabled: e.target.checked })}
            />
            Voice
          </label>

          <label className="flex items-center gap-2">
            OpenAI Voice
            <input
              className="bg-black/40 border border-emerald-800 rounded px-2 py-1 w-36"
              value={openaiVoice}
              onChange={(e) => saveOpenAIVoice(e.target.value)}
              title='Try voices like "alloy", "verse", "aria"'
              placeholder="alloy"
            />
          </label>

          {/* explicit unlock button — render only after mount to avoid hydration mismatch */}
          {mounted && voicePrefs.enabled && !interacted && (
            <button
              onClick={() => {
                setInteracted(true);
                try {
                  localStorage.setItem("kr_voice_unlocked", "1");
                } catch {}
              }}
              className="px-2 py-1 rounded border border-emerald-800 hover:bg-emerald-900/40"
              title="Enable voice"
            >
              Enable voice
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-700/40 p-3 bg-neutral-900/50 min-h-[46vh] sm:min-h-[420px]">
        <div className="space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "assistant" ? "text-emerald-200" : "text-neutral-100"}>
              {m.role === "assistant" ? (
                <div className="rounded-xl bg-emerald-900/30 p-2 whitespace-pre-wrap">{m.text}</div>
              ) : (
                <div className="rounded-xl bg-neutral-800/50 p-2 text-right whitespace-pre-wrap">
                  {m.text}
                </div>
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

      <div className="mt-3 flex gap-2 pb-[env(safe-area-inset-bottom)]">
        <input
          className="flex-1 rounded border border-emerald-700 bg-transparent px-3 py-2 text-[16px] sm:text-base"
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
        <button
          onClick={onSend}
          className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500 text-[16px] sm:text-base"
        >
          Send
        </button>
      </div>

      <div className="text-xs text-neutral-400 mt-2">
        Tip: Press Enter to send, Shift+Enter for newline.
      </div>

      {/* Hidden audio for OpenAI playback */}
      <audio ref={audioRef} hidden />
    </div>
  );
}
