// src/components/KnowRahWidget.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";

/* -------------------------------------------------------------------------- */
/* Types & constants                                                          */
/* -------------------------------------------------------------------------- */

type VoicePrefs = { enabled: boolean; voiceName: string | null; rate: number };
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

// strip emojis before speaking (keep them in UI)
function stripEmojis(text: string): string {
  return text.replace(
    /([\u2700-\u27BF]|\uFE0F|[\u2600-\u26FF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g,
    ""
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function KnowRahWidget() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const userId = useMemo(() => getUserId(), []);
  const timeZone = useMemo(() => getLocalTimeZone(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasInit = useRef(false);

  // idle nudge client timer
  const idleTimer = useRef<number | null>(null);
  const lastActivity = useRef<number>(now());
  const idleDelayMs = useRef<number>(90_000);
  const pageHiddenRef = useRef<boolean>(false);

  // mount gate
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  // tab visibility
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
      idleDelayMs.current = Math.min(idleDelayMs.current * 2, 20 * 60_000);
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
  const [isStreamingAssistant, setIsStreamingAssistant] = useState(false);

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
    setIsStreamingAssistant(true);

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
          setIsStreamingAssistant(false);
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
        setIsStreamingAssistant(false);
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
      setIsStreamingAssistant(false);
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

  /* ---------------------------- Voice & Avatar --------------------------- */

  const [speaking, setSpeaking] = useState(false);
  const [voicePrefs, setVoicePrefs] = useState<VoicePrefs>(() => loadVoicePrefs());

  // OpenAI voice choice (names like "alloy")
  const [openaiVoice, setOpenaiVoice] = useState<string>("alloy");
  function saveOpenAIVoice(v: string) {
    try {
      localStorage.setItem("kr_openai_voice", v);
    } catch {}
    setOpenaiVoice(v);
  }
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedVoice = localStorage.getItem("kr_openai_voice") || "alloy";
    setOpenaiVoice(storedVoice);
  }, []);

  // Autoplay unlock for production
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

  // last assistant text
  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m) continue;
      if (m.role === "assistant") return m.text;
    }
    return null;
  }, [messages]);

  // lip-sync mouth state
  const [mouthOpen, setMouthOpen] = useState(0);
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
  const lastSpokenRef = useRef<string>("");
  const lastURLRef = useRef<string | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    const a = audioRef.current;

    const onPlay = () => {
      setSpeaking(true);
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
      if (lastURLRef.current) {
        URL.revokeObjectURL(lastURLRef.current);
        lastURLRef.current = null;
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

  // speak via OpenAI
  async function speakWithOpenAI(text: string) {
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: openaiVoice,
          format: "mp3",
          stripEmojis: true,
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
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (lastURLRef.current) {
        URL.revokeObjectURL(lastURLRef.current);
      }
      lastURLRef.current = url;

      audio.src = url;
      audio.play().catch(() => {});
    } catch (e) {
      console.error("openai tts error", e);
    }
  }

  // Auto-speak on new assistant text (after stream completes & user interacted)
  useEffect(() => {
    if (!voicePrefs.enabled || !lastAssistant || !interacted) return;
    if (isStreamingAssistant) return;
    const cleanText = stripEmojis(lastAssistant);
    if (!cleanText.trim()) return;

    if (lastSpokenRef.current === cleanText) return;
    speakWithOpenAI(cleanText);
    lastSpokenRef.current = cleanText;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAssistant, voicePrefs, interacted, openaiVoice, isStreamingAssistant]);

  function setPrefs(p: Partial<VoicePrefs>) {
    const next = { ...voicePrefs, ...p };
    setVoicePrefs(next);
    saveVoicePrefs(next);

    if (p.enabled === false) {
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

  // settings panel visibility + click-outside close
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!settingsRef.current) return;
      if (!settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    }
    if (showSettings) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showSettings]);

  return (
    <div className="mx-auto w-full max-w-xl p-4 pt-[env(safe-area-inset-top)]">
      {/* header with title + settings gear */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-emerald-300 font-medium">Priestess KnowRah</div>
            <div className="text-emerald-200/70 text-xs">Presence Online</div>
          </div>
        </div>

        {/* Settings gear */}
        <div className="relative z-50" ref={settingsRef}>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="rounded-full border border-emerald-800/70 bg-black/40 p-2 hover:bg-emerald-900/30 text-emerald-300"
            aria-label="Open settings"
            title="Settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.34 3.94a1 1 0 0 1 1.32 0l1.03.9a1 1 0 0 0 .77.22l1.35-.16a1 1 0 0 1 1.09.78l.27 1.33a1 1 0 0 0 .49.67l1.17.66a1 1 0 0 1 .43 1.3l-.58 1.23a1 1 0 0 0 0 .8l.58 1.23a1 1 0 0 1-.43 1.3l-1.17.66a1 1 0 0 0-.49.67l-.27 1.33a1 1 0 0 1-1.09.78l-1.35-.16a1 1 0 0 0-.77.22l-1.03.9Z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {showSettings && (
            <div
              className="absolute right-0 mt-2 z-50 w-[min(90vw,22rem)] rounded-xl border border-emerald-800/60 bg-neutral-950/95 backdrop-blur p-3 shadow-lg text-sm text-emerald-200"
              role="dialog"
              aria-label="Voice Settings"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800/40">
                <div className="font-medium text-emerald-300">Voice Settings</div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-2 py-1 rounded border border-emerald-800/70 hover:bg-emerald-900/30"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    className="size-4 accent-emerald-400"
                    checked={voicePrefs.enabled}
                    onChange={(e) => setPrefs({ enabled: e.target.checked })}
                  />
                  Enable Voice
                </label>

                <label className="flex items-center gap-2">
                  OpenAI Voice
                  <input
                    className="bg-black/40 border border-emerald-800 rounded px-2 py-1 w-full"
                    value={openaiVoice}
                    onChange={(e) => saveOpenAIVoice(e.target.value)}
                    title='Try "alloy" to start'
                    placeholder="alloy"
                  />
                </label>

                {mounted && voicePrefs.enabled && !interacted && (
                  <button
                    onClick={() => {
                      setInteracted(true);
                      try {
                        localStorage.setItem("kr_voice_unlocked", "1");
                      } catch {}
                    }}
                    className="w-full px-2 py-2 rounded border border-emerald-800 hover:bg-emerald-900/40"
                    title="Enable voice"
                  >
                    Unlock Autoplay
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AVATAR STAGE (replaces chat area) */}
      <div className="relative z-0 rounded-2xl border border-emerald-700/40 bg-neutral-900/60 overflow-hidden aspect-[3/4] min-h-[60vh] sm:min-h-[540px]">
        {/* portrait */}
        <div className="absolute inset-0">
          <Image
            src="/knowrah-avatar.png"
            alt="Priestess KnowRah"
            fill
            priority
            className={`object-contain object-center select-none pointer-events-none animate-breathe ${
              speaking ? "kr-speaking" : ""
            }`}
          />
        </div>

        {/* soft vignette + aura */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(65% 50% at 50% 35%, rgba(16,185,129,0.13), transparent 70%), radial-gradient(100% 85% at 50% 100%, rgba(0,0,0,0.35), transparent 60%)",
            transition: "filter 600ms ease",
            filter: speaking ? "saturate(1.15) brightness(1.05)" : "none",
          }}
        />

        {/* mouth glow (lip-sync hint) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
          style={{
            bottom: "26%",
            width: "18%",
            height: "7%",
            boxShadow: `0 0 ${8 + mouthOpen * 24}px ${
              0.08 + mouthOpen * 0.22
            } rgba(16,185,129,0.95)`,
            opacity: 0.9,
            transition: "box-shadow 60ms linear",
            filter: "blur(2px)",
          }}
          aria-hidden
        />

        {/* subtitles */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <div className="rounded-xl bg-black/55 border border-emerald-800/40 backdrop-blur px-3 py-2 space-y-1">
            {messages.slice(-3).map((m, i) => (
              <div
                key={`${i}-${messages.length}`}
                className="kr-fade-in text-[13px] sm:text-sm leading-snug text-emerald-100/95 whitespace-pre-wrap transition-opacity duration-700"
                style={{ opacity: 0.78 + i * 0.08 }}
              >
                {m.role === "assistant" ? m.text : `You: ${m.text}`}
              </div>
            ))}
            {typing && <div className="kr-fade-in text-emerald-200/90">…</div>}
          </div>
        </div>
        <div ref={bottomRef} className="absolute bottom-0" />
      </div>

      {/* INPUT */}
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

      {/* ephemeral styles for animations (keeps changes self-contained) */}
      <style jsx global>{`
        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
        .animate-breathe {
          animation: breathe 6s ease-in-out infinite;
          will-change: transform;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .kr-fade-in {
          animation: fadeIn 700ms ease both;
        }

        /* very subtle shimmer while speaking */
        .kr-speaking {
          filter: brightness(1.02) contrast(1.02);
        }
      `}</style>
    </div>
  );
}
