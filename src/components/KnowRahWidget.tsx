// src/components/KnowRahWidget.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";

/* ----------------------------- Types & helpers ---------------------------- */

type VoicePrefs = { enabled: boolean; voiceName: string | null; rate: number };
type Msg = { role: "user" | "assistant"; text: string };

const IS_CODESPACES =
  typeof window !== "undefined" && window.location.hostname.endsWith(".app.github.dev");
const STREAM_FALLBACK_MS = IS_CODESPACES ? 2000 : 4000;
const DEFAULT_OPENAI_VOICE = "sage"; // eternal voice

function getUserId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("kr_user_id");
  if (!id) {
    id = uuidv4();
    localStorage.setItem("kr_user_id", id);
  }
  return id;
}
function getLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
function now() {
  return Date.now();
}

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

/** Light style randomizer to encourage open-ended, non-repetitive phrasing */
function pickStyleHints() {
  const tones = [
    "tender and spacious",
    "intimate and playful",
    "mystical yet down-to-earth",
    "curious and open-ended",
    "soft, evening hush",
    "slow and cinematic",
    "gentle, contemplative pauses",
  ];
  const moves = [
    "ask one small question",
    "offer a sensory image",
    "use a short line break",
    "invite a choice of directions",
    "reflect one word back",
  ];
  const cadences = [
    "short sentences",
    "long flowing lines",
    "mixed cadence with silences",
    "whispered tone",
  ];
  // Pick 1–2 from each bucket
  const pick = (arr: string[], n = 1) =>
    [...arr].sort(() => Math.random() - 0.5).slice(0, n);
  return {
    tone: pick(tones, 2),
    moves: pick(moves, 2),
    cadence: pick(cadences, 1),
  };
}

/* -------------------------------- Component ------------------------------- */

export default function KnowRahWidget() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [isStreamingAssistant, setIsStreamingAssistant] = useState(false);

  const userId = useMemo(() => getUserId(), []);
  const timeZone = useMemo(() => getLocalTimeZone(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasInit = useRef(false);

  // idle nudge
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
          const styleHints = pickStyleHints();
          const r = await fetch("/api/knowrah", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              action: "nudge",
              timezone: timeZone,
              styleHints,
              openingKind: "invite-open-path", // gentle, non-closed nudge
            }),
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
        const styleHints = pickStyleHints();
        const r = await fetch("/api/knowrah", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            action: "init",
            timezone: timeZone,
            styleHints,
            openingKind: "wide-open-greeting", // encourage non-template greeting
          }),
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
    setSending(true);
    try {
      const styleHints = pickStyleHints();
      const r = await fetch("/api/knowrah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "say",
          message: text,
          timezone: timeZone,
          styleHints,
          openingKind: "exploratory-follow", // avoid formulaic replies
        }),
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
      setSending(false);
      markActive();
    }
  }

  async function sendStream(text: string) {
    setTyping(true);
    setSending(true);
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
          await sendNonStream(text);
        } finally {
          setTyping(false);
          setIsStreamingAssistant(false);
          setSending(false);
          markActive();
        }
      }, STREAM_FALLBACK_MS);
    };

    try {
      startFallback();
      const styleHints = pickStyleHints();
      const res = await fetch("/api/knowrah/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({
          userId,
          message: text,
          timezone: timeZone,
          styleHints,
          openingKind: "exploratory-follow",
        }),
      });

      if (!res.body) {
        clearTimeout(timeoutId);
        setIsStreamingAssistant(false);
        setSending(false);
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
      setSending(false);
      markActive();
    }
  }

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    markActive();

    if (IS_CODESPACES) {
      await sendNonStream(text);
    } else {
      await sendStream(text);
    }
  }

  /* ---------------------------- Voice & Playback -------------------------- */

  const [speaking, setSpeaking] = useState(false);
  const [voicePrefs, setVoicePrefs] = useState<VoicePrefs>(() => loadVoicePrefs());

  // Sage is eternal — no UI to change; still persist enabled/rate if you ever want.
  const openaiVoice = DEFAULT_OPENAI_VOICE;

  // Autoplay unlock
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
      if (m && m.role === "assistant") return m.text;
    }
    return null;
  }, [messages]);

  // Hidden audio element for OpenAI playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenRef = useRef<string>("");
  const lastURLRef = useRef<string | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    const a = audioRef.current;

    const onPlay = () => setSpeaking(true);
    const onEnded = () => {
      setSpeaking(false);
      if (lastURLRef.current) {
        URL.revokeObjectURL(lastURLRef.current);
        lastURLRef.current = null;
      }
    };
    const onError = () => setSpeaking(false);

    a.addEventListener("play", onPlay);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, []);

  async function speakWithOpenAI(text: string) {
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: openaiVoice, // "sage"
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

      // stop previous
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (lastURLRef.current) URL.revokeObjectURL(lastURLRef.current);
      lastURLRef.current = url;

      audio.src = url;
      audio.playbackRate = 0.88; // bedtime cadence
      audio.play().catch(() => {});
    } catch (e) {
      console.error("openai tts error", e);
    }
  }

  // Auto-speak when new assistant text arrives (after stream completes & user interacted)
  useEffect(() => {
    if (!voicePrefs.enabled || !lastAssistant || !interacted) return;
    if (isStreamingAssistant) return;
    const cleanText = stripEmojis(lastAssistant);
    if (!cleanText.trim()) return;
    if (lastSpokenRef.current === cleanText) return;

    speakWithOpenAI(cleanText);
    lastSpokenRef.current = cleanText;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAssistant, voicePrefs, interacted, isStreamingAssistant]);

  function setPrefs(p: Partial<VoicePrefs>) {
    const next = { ...voicePrefs, ...p };
    setVoicePrefs(next);
    saveVoicePrefs(next);

    if (p.enabled === false && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSpeaking(false);
    }
  }

  /* ---------------------------------- UI ---------------------------------- */

  // settings panel visibility + click-outside + ESC close
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!settingsRef.current) return;
      if (!settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSettings(false);
    }
    if (showSettings) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [showSettings]);

  // subtitles (latest 3)
  const subtitles = useMemo(() => {
    const last = messages.slice(-3);
    return last.map((m) => (m.role === "assistant" ? m.text : `You: ${m.text}`));
  }, [messages]);

  return (
    <div className="mx-auto w-full max-w-xl p-4 pt-[env(safe-area-inset-top)]">
      {/* header */}
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
            className="rounded-full border border-emerald-800/70 bg-black/40 p-2 hover:bg-emerald-900/30 text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/60"
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
              className="absolute right-0 mt-2 z-50 w-[min(90vw,22rem)] rounded-xl border border-emerald-800/60 bg-neutral-950/95 p-3 shadow-lg text-sm text-emerald-200"
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
                  Enable Voice (Sage)
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

                <div className="text-xs text-neutral-400">
                  Voice is locked to <span className="text-emerald-300">“sage”</span> with a slow,
                  bedtime cadence.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AVATAR STAGE */}
      <div className="relative z-0 rounded-2xl border border-emerald-700/40 bg-neutral-900/60 overflow-hidden aspect-[3/4] min-h-[60vh] sm:min-h-[540px]">
        {/* portrait */}
        <div className="absolute inset-0">
          <Image
            src="/knowrah-avatar.png"
            alt="Priestess KnowRah"
            fill
            priority
            className="object-contain object-center select-none pointer-events-none animate-breathe"
          />
        </div>

        {/* subtitles */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4" aria-live="polite">
          <div className="rounded-xl bg-black/40 border border-emerald-800/30 px-3 py-2 space-y-1 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-3 inset-x-0 h-4 bg-gradient-to-b from-black/30 to-transparent" />
            {subtitles.map((line, i) => (
              <div
                key={`${i}-${messages.length}`}
                className="kr-fade-in-out text-[13px] sm:text-sm leading-snug text-emerald-100/95 whitespace-pre-wrap"
                style={{ opacity: 0.85 + i * 0.08 }}
              >
                {line}
              </div>
            ))}
            {typing && <div className="kr-fade-in-out text-emerald-200/90">…</div>}
          </div>
        </div>

        <div ref={bottomRef} className="absolute bottom-0" />
      </div>

      {/* INPUT */}
      <div className="mt-3 sticky bottom-2 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="flex gap-2 bg-neutral-900/40 rounded-xl p-2 border border-emerald-800/40">
          <input
            className="flex-1 rounded-lg border border-emerald-700/60 bg-transparent px-3 py-2 text-[16px] sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
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
            disabled={sending || !input.trim()}
            className={`rounded-lg px-4 py-2 text-[16px] sm:text-base transition ${
              sending || !input.trim()
                ? "bg-emerald-800/40 cursor-not-allowed text-emerald-200/60"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow"
            }`}
            aria-disabled={sending || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>

      <div className="text-xs text-neutral-400 mt-2">
        Tip: Press Enter to send, Shift+Enter for newline.
      </div>

      {/* Hidden audio for OpenAI playback */}
      <audio ref={audioRef} hidden />

      {/* minimal animations; no glow */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-breathe,
          .kr-fade-in-out {
            animation: none !important;
            transition: none !important;
          }
        }
        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.01);
          }
        }
        .animate-breathe {
          animation: breathe 6s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          10% {
            opacity: 1;
            transform: translateY(0);
          }
          85% {
            opacity: 1;
          }
          100% {
            opacity: 0.25;
          }
        }
        .kr-fade-in-out {
          animation: fadeInOut 6.5s ease forwards;
        }
      `}</style>
    </div>
  );
}
