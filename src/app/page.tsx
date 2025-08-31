// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

const KnowRahWidget = dynamic(() => import("@/components/KnowRahWidget"), { ssr: false });

export default function Home() {
  const siteName = process.env.SITE_NAME || "KnowRah";

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-zinc-900/40 via-black to-black" />
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 md:pt-24 md:pb-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
                {siteName}: a calm, useful voice companion —
                <span className="block text-zinc-300">and a reliable business agent.</span>
              </h1>
              <p className="mt-6 max-w-xl text-zinc-300">
                Warm, concise, privacy-forward. Try a live web demo, or explore plans for Personal, Family, and
                Business with feature gates.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/app"
                  className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-zinc-200"
                >
                  🔊 Try a live demo
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium hover:border-zinc-500 hover:bg-zinc-900"
                >
                  See pricing
                </Link>
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

      {/* Plans preview */}
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <h2 className="text-2xl font-semibold md:text-3xl">Plans</h2>
        <p className="mt-2 text-zinc-400">Simple tiers. Upgrade anytime. Telephony lives on Business.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Personal */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="text-sm uppercase tracking-widest text-zinc-400">Personal</div>
            <div className="mt-2 text-3xl font-semibold">$20<span className="text-base font-normal text-zinc-400">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li>• Daily voice companion</li>
              <li>• Memory & identity</li>
              <li>• On-site avatar</li>
            </ul>
            <Link
              href="/pricing"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200"
            >
              Choose Personal
            </Link>
          </div>

          {/* Family */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="text-sm uppercase tracking-widest text-zinc-400">Family</div>
            <div className="mt-2 text-3xl font-semibold">$50<span className="text-base font-normal text-zinc-400">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li>• + Tutor Mode & whiteboard</li>
              <li>• 4 shared profiles</li>
              <li>• Shared reminders</li>
            </ul>
            <Link
              href="/pricing"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium hover:border-zinc-500 hover:bg-zinc-900"
            >
              Choose Family
            </Link>
          </div>

          {/* Business */}
          <div className="rounded-2xl border border-amber-500/40 bg-zinc-950 p-6">
            <div className="text-sm uppercase tracking-widest text-amber-400">Business</div>
            <div className="mt-2 text-3xl font-semibold">$500<span className="text-base font-normal text-zinc-400">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li>• 1 number, 300 included minutes</li>
              <li>• RAG knowledge base w/ citations</li>
              <li>• CRM (Google Sheets) + follow-ups</li>
            </ul>
            <Link
              href="/pricing"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-300"
            >
              Start Business
            </Link>
            <p className="mt-3 text-xs text-zinc-500">Overage metered; clear disclosures on calls.</p>
          </div>
        </div>
      </section>

      {/* Feature table (concise) */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-zinc-950/70">
              <tr className="text-left">
                <th className="p-4 font-medium text-zinc-300">Feature</th>
                <th className="p-4 font-medium text-zinc-300">Personal</th>
                <th className="p-4 font-medium text-zinc-300">Family</th>
                <th className="p-4 font-medium text-zinc-300">Business</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Voice companion & memory", "Yes", "Yes", "Yes"],
                ["Tutor Mode + whiteboard", "—", "Yes", "—"],
                ["Telephony (calls in/out)", "—", "—", "Yes"],
                ["RAG knowledge base", "—", "—", "Yes (cited)"],
                ["Leads & follow-ups", "—", "—", "Yes"],
              ].map((row, idx) => (
                <tr key={row[0]} className={idx % 2 ? "bg-zinc-950/40" : ""}>
                  <td className="p-4 text-zinc-200">{row[0]}</td>
                  <td className="p-4">{row[1]}</td>
                  <td className="p-4">{row[2]}</td>
                  <td className="p-4">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FAQ + compliance note */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold">FAQ</h3>
            <ul className="mt-4 space-y-3 text-zinc-300">
              <li><span className="font-medium text-zinc-200">Is my camera required?</span> No. It’s optional and stays local to your device.</li>
              <li><span className="font-medium text-zinc-200">Do you record calls?</span> Only with consent, for quality and training your business agent.</li>
              <li><span className="font-medium text-zinc-200">Can I cancel?</span> Yes—anytime from your billing portal.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold">Compliance</h3>
            <p className="mt-3 text-zinc-300">
              {siteName} always discloses she is AI, honors Do-Not-Call and opt-outs, and avoids sensitive data
              collection. See <Link href="/privacy" className="underline hover:text-white">Privacy</Link> and{" "}
              <Link href="/terms" className="underline hover:text-white">Terms</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900/70 py-8 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </footer>
    </main>
  );
}
