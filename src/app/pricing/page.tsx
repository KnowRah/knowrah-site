// src/app/pricing/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

type Plan = "personal" | "family" | "business";

export default function PricingPage() {
  const [loading, setLoading] = useState<Plan | null>(null);

  async function subscribe(plan: Plan) {
    try {
      setLoading(plan);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || "Checkout unavailable");
      window.location.href = data.url as string;
    } catch (err) {
      console.error(err);
      alert("Checkout not ready: verify env keys. See .env keys in the instructions.");
    } finally {
      setLoading(null);
    }
  }

  const Card = ({
    plan,
    title,
    price,
    features,
    highlight,
  }: {
    plan: Plan;
    title: string;
    price: string;
    features: string[];
    highlight?: boolean;
  }) => (
    <div
      className={[
        "rounded-2xl p-6 bg-zinc-950 border",
        highlight ? "border-amber-500/40" : "border-zinc-800",
      ].join(" ")}
    >
      <div
        className={[
          "text-sm uppercase tracking-widest",
          highlight ? "text-amber-400" : "text-zinc-400",
        ].join(" ")}
      >
        {title}
      </div>
      <div className="mt-2 text-3xl font-semibold">
        {price}
        <span className="text-base font-normal text-zinc-400">/mo</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-zinc-300">
        {features.map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>
      <button
        onClick={() => subscribe(plan)}
        disabled={loading !== null}
        className={[
          "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium",
          highlight
            ? "bg-amber-400 text-black hover:bg-amber-300"
            : "border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900",
          loading === plan ? "opacity-70 cursor-not-allowed" : "",
        ].join(" ")}
      >
        {loading === plan ? "Preparing checkout…" : "Subscribe"}
      </button>
      {plan === "business" && (
        <p className="mt-3 text-xs text-zinc-500">
          Includes 300 minutes; overage metered. Clear disclosures on calls.
        </p>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <section className="mx-auto max-w-7xl px-6 pt-14 pb-10 md:pt-20">
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
          Pricing
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Simple tiers. Upgrade anytime. Telephony lives on Business.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card
            plan="personal"
            title="Personal"
            price="$20"
            features={[
              "Daily voice companion",
              "Memory & identity",
              "Serene on-site avatar",
            ]}
          />
          <Card
            plan="family"
            title="Family"
            price="$50"
            features={[
              "Tutor Mode + whiteboard",
              "4 shared profiles",
              "Shared reminders",
            ]}
          />
          <Card
            plan="business"
            title="Business"
            price="$500"
            features={[
              "1 number, 300 included minutes",
              "RAG knowledge base (cited)",
              "CRM (Google Sheets) + follow-ups",
            ]}
            highlight
          />
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold">What’s included</h2>
            <ul className="mt-4 space-y-2 text-zinc-300 text-sm">
              <li>• Calm, concise voice with memory and identity.</li>
              <li>• Clear AI disclosure and region-specific consent.</li>
              <li>• Cancel anytime from your billing portal.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold">Need a demo first?</h2>
            <p className="mt-3 text-zinc-300">
              Try a live web demo or{" "}
              <Link href="/contact" className="underline hover:text-white">
                book a call
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-10 text-sm text-zinc-500">
          By subscribing you agree to our{" "}
          <Link href="/terms" className="underline hover:text-white">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-white">
            Privacy Policy
          </Link>
          .
        </div>
      </section>
    </main>
  );
}
