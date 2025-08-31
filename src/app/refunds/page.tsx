// src/app/refunds/page.tsx
export default function RefundsPage() {
  const siteName = process.env.SITE_NAME || "KnowRah";
  const contactEmail = process.env.SUPPORT_EMAIL || "support@knowrah.com";
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <section className="mx-auto max-w-4xl px-6 pt-14 pb-20">
        <h1 className="text-4xl font-semibold">Refund Policy</h1>
        <p className="mt-2 text-zinc-400">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-invert mt-8">
          <h2>Summary</h2>
          <ul>
            <li><strong>First-time purchases:</strong> 7-day full refund on request.</li>
            <li><strong>Monthly subscriptions:</strong> pro-rated refund for unused days if you cancel within the current billing period.</li>
            <li><strong>Annual subscriptions:</strong> pro-rated refund of the remaining term upon cancellation.</li>
            <li>Abuse or excessive usage during a trial may disqualify a refund.</li>
          </ul>

          <h2>How to request a refund</h2>
          <ol>
            <li>Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a> from your account email, or</li>
            <li>Use the billing portal link in your receipt to contact <strong>Paddle</strong> (Merchant of Record) directly.</li>
          </ol>

          <h2>Billing portal & cancellations</h2>
          <p>
            You can cancel anytime from your billing portal link (provided after checkout). On cancellation,
            access continues until the end of the paid period unless a refund is processed earlier.
          </p>

          <h2>Notes</h2>
          <p>
            Taxes and fees handled by Paddle follow Paddle’s rules and regional regulations. This policy does not
            limit rights that may be available to you under local law.
          </p>

          <p className="mt-8 text-sm text-zinc-400">Questions? Email {contactEmail}.</p>
        </div>
      </section>
    </main>
  );
}
