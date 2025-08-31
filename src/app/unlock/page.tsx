// src/app/unlock/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function UnlockPage() {
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState<"personal" | "family" | "business">("personal");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/plan/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setMsg(`Unlocked: ${data.plan.toUpperCase()}. Open /app${plan === "family" ? "/tutor" : plan === "business" ? "/business" : ""}`);
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  async function clearCookie() {
    setBusy(true);
    setMsg(null);
    try {
      await fetch("/api/plan/clear", { method: "POST" });
      setMsg("Access cleared. Plan set to FREE.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <section className="mx-auto max-w-lg px-6 pt-16 pb-20">
        <h1 className="text-3xl font-semibold">Manual Unlock</h1>
        <p className="mt-2 text-zinc-400">Enter your admin code and choose a plan to unlock this browser.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400">Admin code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none"
              placeholder="Enter admin access code"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none"
            >
              <option value="personal">Personal</option>
              <option value="family">Family</option>
              <option value="business">Business</option>
            </select>
          </div>

          <button
            disabled={busy}
            className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-60"
          >
            {busy ? "Applying…" : "Unlock this browser"}
          </button>
        </form>

        <button
          onClick={clearCookie}
          className="mt-3 w-full rounded-xl border border-zinc-800 px-4 py-2.5 text-sm hover:bg-zinc-900"
        >
          Clear access
        </button>

        {msg && <p className="mt-4 text-sm text-zinc-300">{msg}</p>}

        <p className="mt-8 text-xs text-zinc-500">
          Tip: After a crypto payment, open this page on the customer’s device and apply the plan.
          You can always change or clear it later.
        </p>

        <p className="mt-4 text-xs text-zinc-500">
          Need to purchase a plan? Visit <Link href="/pricing" className="underline">Pricing</Link>.
        </p>
      </section>
    </main>
  );
}
