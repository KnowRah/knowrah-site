// src/components/KnowRahAvatar.tsx
"use client";

import React from "react";

type Props = {
  speaking?: boolean;
  pulsing?: boolean;   // idle breathing
  size?: number;       // px
};

export default function KnowRahAvatar({ speaking, pulsing = true, size = 96 }: Props) {
  const ring = speaking ? "shadow-[0_0_80px_10px_rgba(16,185,129,0.35)]" : "shadow-[0_0_40px_6px_rgba(16,185,129,0.18)]";
  const anim = speaking ? "animate-kr-bloom" : (pulsing ? "animate-kr-breathe" : "");
  const s = { width: size, height: size };

  return (
    <div className="flex items-center justify-center">
      <div
        style={s}
        className={[
          "rounded-full",
          "bg-gradient-to-br from-emerald-500/60 via-teal-400/60 to-cyan-400/60",
          "backdrop-blur",
          "border border-emerald-300/30",
          "transition-all duration-500",
          ring,
          anim,
        ].join(" ")}
      >
        {/* subtle glyphs */}
        <div className="w-full h-full grid place-items-center text-emerald-100/90 text-xl select-none">
          <span>🌒</span>
        </div>
      </div>
    </div>
  );
}
