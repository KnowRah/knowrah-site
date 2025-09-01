// src/components/AnimatedPriestessAvatar.tsx
"use client";
import React from "react";

/**
 * Subtle animated priestess avatar:
 * - Emerald aura pulse + incense smoke
 * - Hooded silhouette (SVG)
 * - Gentle eye blinks
 * - Lip-sync mouth driven by mouthOpen (0..1)
 * - Etched glyph ring overlay (🌒 🜂 🧬 ∞)
 */
export default function AnimatedPriestessAvatar({
  speaking,
  mouthOpen,
  title = "Priestess KnowRah",
}: {
  speaking: boolean;
  mouthOpen: number; // 0..1
  title?: string;
}) {
  const mouthScale = 0.25 + Math.max(0, Math.min(1, mouthOpen)) * 0.9;

  return (
    <div
      className={[
        "relative w-16 h-16 rounded-full grid place-items-center overflow-hidden",
        "border border-emerald-300/30 bg-neutral-900",
        speaking
          ? "shadow-[0_0_90px_12px_rgba(16,185,129,0.35)] animate-kr-aura"
          : "shadow-[0_0_50px_8px_rgba(16,185,129,0.18)]",
      ].join(" ")}
      title={title}
      aria-label={title}
      role="img"
    >
      {/* Aura glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.35),transparent_60%)]" />

      {/* Incense smoke */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="kr-smoke kr-smoke-1" />
        <div className="kr-smoke kr-smoke-2" />
      </div>

      {/* SVG hooded priestess silhouette */}
      <svg
        className="relative z-[1]"
        width="52"
        height="52"
        viewBox="0 0 52 52"
        aria-hidden
      >
        {/* Hood */}
        <path
          d="M26 5 C16 5, 8 16, 8 26 C8 34, 12 38, 16 42 L36 42 C40 38, 44 34, 44 26 C44 16, 36 5, 26 5 Z"
          fill="url(#hoodGrad)"
          stroke="rgba(16,185,129,0.35)"
          strokeWidth="0.6"
        />
        {/* Face */}
        <circle cx="26" cy="25.5" r="7.6" fill="#0c0f0d" />
        <circle cx="26" cy="25.2" r="6.9" fill="url(#faceGrad)" />

        {/* Eyes (blink via CSS on group) */}
        <g className="kr-eyes">
          <rect x="21.5" y="24" width="3.4" height="1.2" rx="0.6" fill="#0c1a14" />
          <rect x="27.1" y="24" width="3.4" height="1.2" rx="0.6" fill="#0c1a14" />
        </g>

        {/* Mouth — height scales with speech (lip-sync) */}
        <g transform="translate(0,0)">
          <rect
            x="24"
            y="28.8"
            width="4"
            height="2"
            rx="1"
            fill="rgba(16,185,129,0.55)"
            style={{
              transformOrigin: "26px 29.8px",
              transform: `scaleY(${mouthScale})`,
              transition: "transform 60ms linear",
              filter: mouthOpen > 0.4 ? "drop-shadow(0 0 6px rgba(16,185,129,0.35))" : "none",
            }}
          />
        </g>

        <defs>
          <radialGradient id="hoodGrad" cx="50%" cy="20%" r="80%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.35)" />
            <stop offset="55%" stopColor="rgba(6,78,59,0.55)" />
            <stop offset="100%" stopColor="rgba(2,44,34,0.9)" />
          </radialGradient>
          <radialGradient id="faceGrad" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#0f1e18" />
            <stop offset="100%" stopColor="#0a1410" />
          </radialGradient>
        </defs>
      </svg>

      {/* Etched glyph ring overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-full">
        <div className="absolute inset-[2px] rounded-full border border-emerald-500/15" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-emerald-300/50 tracking-[0.2em]">
          <span className="kr-glyph-text">🌒 🜂 🧬 ∞ 🌒 🜂 🧬 ∞</span>
        </div>
      </div>
    </div>
  );
}
