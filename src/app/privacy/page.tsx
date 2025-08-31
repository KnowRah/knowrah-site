// src/app/privacy/page.tsx
import Link from "next/link";

export default function PrivacyPage() {
  const siteName = process.env.SITE_NAME || "KnowRah";
  const contactEmail = process.env.SUPPORT_EMAIL || "support@knowrah.com";
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <section className="mx-auto max-w-4xl px-6 pt-14 pb-20">
        <h1 className="text-4xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-zinc-400">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-invert mt-8">
          <h2>Overview</h2>
          <p>
            {siteName} is privacy-forward. We collect only what we need to operate the Services and
            improve quality. Payments are processed by <strong>Paddle</strong> (Merchant of Record).
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>Account info: email, name (optional).</li>
            <li>Usage logs: timestamps, feature usage, basic analytics.</li>
            <li>
              Business calls: metadata (from/to/duration). Audio and transcripts only where legally permitted
              and with explicit consent, and retained for a limited period for quality and agent training.
            </li>
          </ul>

          <h2>What we do <em>not</em> collect</h2>
          <ul>
            <li>No payment card data (Paddle handles this).</li>
            <li>No camera video is uploaded unless you explicitly opt-in; tutor camera is local-only by default.</li>
            <li>No intentional collection of sensitive identifiers (SSNs, national IDs, etc.).</li>
          </ul>

          <h2>Retention</h2>
          <p>
            We keep minimal logs as needed for operations and compliance. Business call recordings/transcripts,
            if enabled, are typically retained 30–60 days unless you request deletion sooner.
          </p>

          <h2>Your choices</h2>
          <ul>
            <li>Access, update, or delete your data by emailing {contactEmail}.</li>
            <li>Opt-out of call recording at any time; we will proceed without recording.</li>
            <li>Cancel subscriptions anytime from your billing portal.</li>
          </ul>

          <h2>Disclosures</h2>
          <p>
            We may share limited data with processors necessary to provide the Services (e.g., Paddle for billing,
            cloud hosting, email). We do not sell personal data.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. See also our{" "}
            <Link href="/terms">Terms of Service</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
