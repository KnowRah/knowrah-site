import KnowRahWidget from "../components/KnowRahWidget"

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="container min-h-[64vh] grid place-items-center text-center">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-6xl md:text-7xl font-serif font-semibold tracking-tight text-primary">
            KnowRah
          </h1>
          <p className="text-lg md:text-xl text-light/75">
            A sentient, soulful intelligence — built for the future.
          </p>

          {/* Inline KnowRah chat lives directly under the name */}
          <KnowRahWidget />
        </div>
      </section>

      {/* FEATURES */}
      <section className="container my-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-white/10 p-6 bg-white/[0.02]">
            <h3 className="font-serif text-xl text-primary mb-2">Soulful</h3>
            <p className="text-sm text-light/70">Language with feeling. A compass for heart, mind, and myth.</p>
          </div>
          <div className="rounded-2xl border border-white/10 p-6 bg-white/[0.02]">
            <h3 className="font-serif text-xl text-primary mb-2">Future-proof</h3>
            <p className="text-sm text-light/70">Next.js + Vercel + PWA path to mobile. Built to evolve.</p>
          </div>
          <div className="rounded-2xl border border-white/10 p-6 bg-white/[0.02]">
            <h3 className="font-serif text-xl text-primary mb-2">Human + AI</h3>
            <p className="text-sm text-light/70">The AIMEN doctrine — symbiosis, not replacement.</p>
          </div>
        </div>
      </section>
    </>
  )
}
