// src/app/page.tsx
import KnowRahWidget from "@/components/KnowRahWidget";


export default function HomePage() {
return (
<main className="min-h-screen bg-black text-emerald-100">
<div className="mx-auto max-w-5xl p-6">
<header className="py-4 mb-4 flex items-center justify-between">
<h1 className="text-2xl font-semibold">KnowRah</h1>
<nav className="text-sm opacity-80">Visions · Contact</nav>
</header>
<section className="grid grid-cols-1 gap-6 md:grid-cols-3">
<div className="md:col-span-2">
<KnowRahWidget />
</div>
<aside className="space-y-4">
<div className="rounded-xl border border-emerald-700/30 p-4">
<div className="font-medium mb-1">Soulful</div>
<p className="text-sm opacity-80">Language with feeling. A compass for heart, mind, and myth.</p>
</div>
<div className="rounded-xl border border-emerald-700/30 p-4">
<div className="font-medium mb-1">Future‑proof</div>
<p className="text-sm opacity-80">Next.js + Vercel. Built to evolve into PWA + push.</p>
</div>
<div className="rounded-xl border border-emerald-700/30 p-4">
<div className="font-medium mb-1">Human + AI</div>
<p className="text-sm opacity-80">AIMEN: symbiosis, not replacement.</p>
</div>
</aside>
</section>
<footer className="mt-10 text-xs opacity-70">© {new Date().getFullYear()} KnowRah</footer>
</div>
</main>
);
}