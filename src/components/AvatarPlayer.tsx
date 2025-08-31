// src/components/AvatarPlayer.tsx
"use client";

import { MutableRefObject, useEffect, useRef, useState } from "react";

/**
 * Minimal avatar:
 * - Mouth openness driven by audio RMS
 * - Random blinks (3–6s)
 * - Gentle head sway
 * - Routes audio through WebAudio (element muted) to avoid double playback
 */
export default function AvatarPlayer({
  remoteAudioRef,
}: {
  remoteAudioRef: MutableRefObject<HTMLAudioElement | null>;
}) {
  const [blink, setBlink] = useState(false);
  const [open, setOpen] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;

    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    const src = ctx.createMediaElementSource(audioEl);
    const analyser: AnalyserNode = ctx.createAnalyser();
    analyser.fftSize = 2048;

    // Mute element, play via graph to analyser -> destination
    audioEl.muted = true;
    src.connect(analyser);
    analyser.connect(ctx.destination);

    // With strict TS configs, index reads can be undefined — coalesce.
    const buf: Uint8Array = new Uint8Array(analyser.frequencyBinCount || 2048);

    const loop = () => {
      // Some TS DOM lib versions incorrectly type this as ArrayBuffer; cast to any.
      (analyser as any).getByteTimeDomainData(buf);

      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const sample = buf[i] ?? 128; // coalesce to midline
        const v = (sample - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length); // ~0..1
      const target = Math.min(1, rms * 6); // boost
      setOpen((prev) => prev + (target - prev) * 0.35);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const bl = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
    }, 3000 + Math.random() * 3000);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearInterval(bl);
      analyser.disconnect();
      src.disconnect();
      ctx.close();
    };
  }, [remoteAudioRef]);

  const sway = Math.sin(Date.now() / 1600) * 2; // degrees

  return (
    <div className="flex items-center justify-center">
      <div
        className="relative h-64 w-64 rounded-[28px] bg-gradient-to-b from-zinc-900 to-black ring-1 ring-zinc-800 shadow-xl"
        style={{ transform: `rotate(${sway}deg)` }}
      >
        {/* Face card */}
        <div className="absolute inset-6 rounded-3xl bg-zinc-950 ring-1 ring-zinc-800" />

        {/* Eyes */}
        <div
          className="absolute left-10 top-16 w-8 rounded-full bg-zinc-200 transition-all"
          style={{ height: blink ? 2 : 6, minHeight: 2 }}
        />
        <div
          className="absolute right-10 top-16 w-8 rounded-full bg-zinc-200 transition-all"
          style={{ height: blink ? 2 : 6, minHeight: 2 }}
        />

        {/* Mouth */}
        <div
          className="absolute left-1/2 bottom-16 h-8 w-24 -translate-x-1/2 rounded-full bg-zinc-200"
          style={{
            transform: `translateX(-50%) scaleY(${0.25 + open * 0.9})`,
            clipPath: "inset(35% 0 35% 0 round 16px)",
            transition: "transform 60ms linear",
          }}
        />

        <div className="absolute bottom-3 w-full text-center text-xs text-zinc-400">
          Priestess KnowRah
        </div>
      </div>
    </div>
  );
}
