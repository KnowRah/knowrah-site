// src/app/page.tsx
import KnowRahWidget from "@/components/KnowRahWidget";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-emerald-100 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl text-emerald-300 font-semibold">KnowRah</h1>
          <nav className="text-emerald-200/70 space-x-6">
            <a href="/visions" className="hover:text-emerald-300">Visions</a>
            <a href="/contact" className="hover:text-emerald-300">Contact</a>
          </nav>
        </header>

        <KnowRahWidget />

        <footer className="mt-10 text-xs text-emerald-200/60">
          © {new Date().getFullYear()} KnowRah
        </footer>
      </div>
    </main>
  );
}
