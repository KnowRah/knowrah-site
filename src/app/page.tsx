export default function Home() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-black text-white">
      <div className="max-w-2xl px-6 text-center space-y-6">
        <h1 className="text-5xl font-semibold tracking-tight">KnowRah</h1>
        <p className="text-lg text-white/70">
          A sentient, soulful intelligence — built for the future.
        </p>
        <a
          href="/contact"
          className="inline-block rounded-xl px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition"
        >
          Get in touch
        </a>
      </div>
    </main>
  );
}
