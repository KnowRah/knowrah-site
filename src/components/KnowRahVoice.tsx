// src/components/KnowRahVoice.tsx
"use client";

import React from "react";

type VoiceState = {
  enabled: boolean;
  voiceName: string | null;
  rate: number; // 0.5–2.0
};

type Props = {
  text: string | null;          // last assistant text to speak
  autoSpeak?: boolean;          // speak automatically on text change (default: true)
  onStart?: () => void;
  onEnd?: () => void;
};

const STORAGE_KEY = "knowrah.voice.prefs";

function loadPrefs(): VoiceState {
  if (typeof window === "undefined") return { enabled: true, voiceName: null, rate: 1 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: true, voiceName: null, rate: 1 };
    return JSON.parse(raw);
  } catch {
    return { enabled: true, voiceName: null, rate: 1 };
  }
}

function savePrefs(p: VoiceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

export default function KnowRahVoice({
  text,
  autoSpeak = true,
  onStart,
  onEnd,
}: Props) {
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [prefs, setPrefs] = React.useState<VoiceState>(loadPrefs());
  const [speaking, setSpeaking] = React.useState(false);

  // Load available voices
  React.useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    function handle() {
      setVoices(synth.getVoices());
    }

    handle();
    synth.onvoiceschanged = handle;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  // Auto-speak when new text arrives
  React.useEffect(() => {
    if (!autoSpeak || !text || !prefs.enabled) return;
    speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  function speak(phrase: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    try {
      // cancel any ongoing utterance first
      if (synth.speaking) synth.cancel();

      const u = new SpeechSynthesisUtterance(phrase);
      if (prefs.voiceName) {
        const v = voices.find((vv) => vv.name === prefs.voiceName);
        if (v) u.voice = v;
      }
      u.rate = Math.min(2, Math.max(0.5, prefs.rate));
      u.onstart = () => {
        setSpeaking(true);
        onStart?.();
      };
      u.onend = () => {
        setSpeaking(false);
        onEnd?.();
      };
      u.onerror = () => {
        setSpeaking(false);
        onEnd?.();
      };
      synth.speak(u);
    } catch {
      // swallow
    }
  }

  function stop() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();
    setSpeaking(false);
    onEnd?.();
  }

  function setEnabled(enabled: boolean) {
    const next = { ...prefs, enabled };
    setPrefs(next);
    savePrefs(next);
    if (!enabled) stop();
  }

  function setVoiceName(voiceName: string | null) {
    const next = { ...prefs, voiceName };
    setPrefs(next);
    savePrefs(next);
  }

  function setRate(rate: number) {
    const next = { ...prefs, rate };
    setPrefs(next);
    savePrefs(next);
  }

  return (
    <div className="flex items-center gap-3 text-sm text-emerald-300/90">
      <label className="flex items-center gap-2 select-none">
        <input
          type="checkbox"
          className="size-4 accent-emerald-400"
          checked={prefs.enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Voice
      </label>

      <select
        className="bg-black/40 border border-emerald-800 rounded px-2 py-1"
        value={prefs.voiceName ?? ""}
        onChange={(e) => setVoiceName(e.target.value || null)}
        title="Choose a system voice"
      >
        <option value="">System default</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name} {v.lang ? `(${v.lang})` : ""}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2">
        Rate
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={prefs.rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
        />
      </label>

      {speaking ? (
        <button
          onClick={stop}
          className="px-2 py-1 rounded border border-emerald-800 hover:bg-emerald-900/40"
          title="Stop"
        >
          Stop
        </button>
      ) : text ? (
        <button
          onClick={() => speak(text)}
          className="px-2 py-1 rounded border border-emerald-800 hover:bg-emerald-900/40"
          title="Play last message"
        >
          Play
        </button>
      ) : null}
    </div>
  );
}
