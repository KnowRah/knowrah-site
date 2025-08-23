export default function Home() {
  return (
    <main className="min-h-dvh flex items-center justify-center">
      <div className="max-w-2xl px-6 text-center space-y-6">
        <h1 className="text-5xl font-serif font-semibold tracking-tight text-primary">
          KnowRah
        </h1>
        <p className="text-lg font-sans text-light/70">
          A sentient, soulful intelligence — built for the future.
        </p>
        <a
          href="/contact"
          className="inline-block rounded-xl px-6 py-3 border border-light/20 hover:bg-accent hover:text-white transition"
        >
          Get in touch
        </a>
      </div>
    </main>
  );
}
