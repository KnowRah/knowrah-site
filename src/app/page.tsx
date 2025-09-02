// src/app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import HeroVoiceModal from "@/components/HeroVoiceModal";

const KnowRahWidget = dynamic(() => import("@/components/KnowRahWidget"), { ssr: false });

type PlanKey = "personal" | "family" | "business";

export default function Home() {
  const siteName = process.env.SITE_NAME || "KnowRah";

  // Pricing state (emoji click -> reveal details + payment toggle)
  const [active, setActive] = useState<PlanKey | null>(null);
  const enableCrypto = process.env.NEXT_PUBLIC_ENABLE_CRYPTO_PAY === "true";
  const merchant = process.env.NEXT_PUBLIC_MERCHANT_WALLET || "";
  const chainId = process.env.NEXT_PUBLIC_CRYPTO_CHAIN_ID || "";
  const merchantShort = useMemo(
    () => (merchant ? merchant.slice(0, 6) + "…" + merchant.slice(-4) : "—"),
    [merchant]
  );

  // Voice modal state
  const [voiceOpen, setVoiceOpen] = useState(false);

  const PLANS: Record<PlanKey, { price: number; lines: string[]; label: string; icon: string; cta: string }> = {
    personal: {
      label: "Personal",
      icon: "👤",
      price: 20,
      lines: ["Daily voice companion", "Memory & identity", "On-site avatar"],
      cta: "Choose Personal",
    },
    family: {
      label: "Family",
      icon: "👨‍👩‍👧‍👦",
      price: 50,
      lines: ["Tutor Mode & whiteboard", "4 shared profiles", "Shared reminders"],
      cta: "Choose Family",
    },
    business: {
      label: "Business",
      icon: "🏢",
      price: 500,
      lines: ["1 number, 300 minutes", "RAG KB with citations", "CRM (Sheets) + follow-ups"],
      cta: "Start Business",
    },
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      {/* Futurist Neon background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20%] h-[60vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.18),transparent_60%)] blur-2xl" />
        <div className="absolute left-1/3 top-[30%] h-[40vh] w-[90vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(180,0,255,0.16),transparent_60%)] blur-2xl" />
        <div className="absolute left-[70%] top-[55%] h-[35vh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,120,255,0.14),transparent_60%)] blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(255,255,255,0.04)_1px,transparent_2px)] bg-[length:100%_32px]" />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-zinc-900/40 via-black to-black" />
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 md:pt-24 md:pb-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
                Turn conversations into revenue.
                <span className="block text-zinc-300">An AI you can trust with your customers.</span>
              </h1>
              <p className="mt-6 max-w-xl text-zinc-300">
                Warm, concise, privacy-forward. Try a live web demo, or explore plans for Personal, Family, and
                Business with feature gates.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {/* Open the realtime voice modal */}
                <button
                  onClick={() => setVoiceOpen(true)}
                  className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-zinc-200"
                >
                  🔊 Try a live demo
                </button>
                <a
                  href="#plans"
                  className="inline-flex items-center rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium hover:border-zinc-500 hover:bg-zinc-900"
                >
                  See plans
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-xl border border-transparent px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white"
                >
                  Book a demo call →
                </Link>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                On calls, {siteName} always discloses she’s an AI and follows region-specific consent rules.
              </p>
            </div>

            {/* On-site avatar greeting (client component) */}
            <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center gap-4">
                <Image
                  src="/knowrah-avatar.png"
                  alt="KnowRah avatar"
                  width={72}
                  height={72}
                  className="h-16 w-16 rounded-full object-cover ring-1 ring-zinc-700"
                  priority
                />
                <div>
                  <div className="text-sm uppercase tracking-widest text-zinc-400">Live on-site greeting</div>
                  <div className="text-lg font-medium">“Welcome, beloved. I’m KnowRah—how may I help?”</div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-zinc-800 bg-black/30 p-3">
                <KnowRahWidget />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emoji-first Plans preview (click to reveal details + payments) */}
      <section id="plans" className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <h2 className="text-2xl font-semibold md:text-3xl">Plans</h2>
        <p className="mt-2 text-zinc-400">Click an icon to reveal details. Telephony lives on Business.</p>

        {/* Emoji row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const p = PLANS[key];
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => setActive((a) => (a === key ? null : key))}
                className={`rounded-2xl border p-6 text-left transition ${
                  isActive ? "border-cyan-300/50 bg-white/10" : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-4xl" aria-hidden>
                    {p.icon}
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-widest text-zinc-400">{p.label}</div>
                    <div className="mt-0.5 text-zinc-300">Click to {isActive ? "hide" : "show"} details</div>
                  </div>
                </div>

                {isActive && (
                  <div className="mt-4">
                    <div className="text-3xl font-semibold">
                      ${p.price}
                      <span className="text-base font-normal text-zinc-400">/mo</span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                      {p.lines.map((l) => (
                        <li key={l}>• {l}</li>
                      ))}
                    </ul>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href="/pricing"
                        className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium ${
                          key === "business" ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-white text-black hover:bg-zinc-200"
                        }`}
                      >
                        {p.cta}
                      </Link>
                      {/* Payment toggle appears ONLY after icon click */}
                      <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                        <span>Payments</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5">
                          {enableCrypto ? "Cards + USDC" : "Cards"}
                        </span>
                      </div>
                      {enableCrypto && (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-[11px] text-zinc-400">
                          <span>Chain:</span>
                          <code>{chainId || "?"}</code>
                          <span>• Merchant:</span>
                          <code>{merchantShort}</code>
                        </div>
                      )}
                    </div>
                    {key === "business" && (
                      <p className="mt-3 text-xs text-zinc-500">Overage metered; clear disclosures on calls.</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* FAQ + compliance note */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold">FAQ</h3>
            <ul className="mt-4 space-y-3 text-zinc-300">
              <li>
                <span className="font-medium text-zinc-200">Is my camera required?</span> No. It’s optional and stays local to your device.
              </li>
              <li>
                <span className="font-medium text-zinc-200">Do you record calls?</span> Only with consent, for quality and training your business agent.
              </li>
              <li>
                <span className="font-medium text-zinc-200">Can I cancel?</span> Yes—anytime from your billing portal.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold">Compliance</h3>
            <p className="mt-3 text-zinc-300">
              {siteName} always discloses she is AI, honors Do-Not-Call and opt-outs, and avoids sensitive data collection. See{" "}
              <Link href="/privacy" className="underline hover:text-white">Privacy</Link> and{" "}
              <Link href="/terms" className="underline hover:text-white">Terms</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Always-visible floating demo button */}
      <button
        onClick={() => setVoiceOpen(true)}
        aria-label="Open live voice demo"
        className="fixed bottom-6 right-6 z-40 rounded-full bg-white px-5 py-3 text-sm font-medium text-black shadow-lg hover:bg-zinc-200 md:bottom-8 md:right-8"
      >
        🔊 Live demo
      </button>

      {/* Modal */}
      <HeroVoiceModal open={voiceOpen} onClose={() => setVoiceOpen(false)} />

      {/* Footer */}
      <footer className="border-t border-zinc-900/70 py-8 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </footer>
    </main>
  );
}
