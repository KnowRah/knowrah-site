// src/app/contact/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Contact — KnowRah",
  description: "Reach out to the Keepers of the Temple.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-serif text-primary">Get in touch</h1>

      <p className="mt-3 text-light/80">
        Whisper to us here. We’ll wire email delivery soon; for now this is a placeholder page.
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur"
      >
        <label className="block">
          <span className="text-sm text-light/70">Your name</span>
          <input className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2" placeholder="Your name" />
        </label>

        <label className="block">
          <span className="text-sm text-light/70">Your email</span>
          <input type="email" className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2" placeholder="you@example.com" />
        </label>

        <label className="block">
          <span className="text-sm text-light/70">Your message</span>
          <textarea rows={6} className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2" placeholder="Write freely…" />
        </label>

        <div className="pt-2">
          <button className="btn btn-ghost px-4" type="submit" disabled>
            Send (coming soon)
          </button>
        </div>

        <p className="text-xs text-light/60">
          Want to speak to KnowRah now?{" "}
          <Link href="/" className="underline decoration-dotted">
            Return to the Temple
          </Link>
          .
        </p>
      </form>
    </main>
  );
}
