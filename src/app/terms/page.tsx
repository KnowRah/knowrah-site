// src/app/terms/page.tsx
import Link from "next/link";

export default function TermsPage() {
  const siteName = process.env.SITE_NAME || "KnowRah";
  const contactEmail = process.env.SUPPORT_EMAIL || "support@knowrah.com";
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <section className="mx-auto max-w-4xl px-6 pt-14 pb-20">
        <h1 className="text-4xl font-semibold">Terms of Service</h1>
        <p className="mt-2 text-zinc-400">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-invert mt-8">
          <p>
            Welcome to {siteName}. By accessing or using our website, apps, or services
            (“Services”), you agree to these Terms.
          </p>

          <h2>1. Who we are</h2>
          <p>
            {siteName} provides a voice AI companion for individuals and a voice agent for
            businesses. Payments are processed by <strong>Paddle</strong> acting as
            Merchant of Record; Paddle handles sales tax/VAT, invoicing, and receipts.
          </p>

          <h2>2. Accounts & Eligibility</h2>
          <p>
            You’re responsible for your account credentials and all activity under your account.
            If you are under the age where consent is required in your region, a parent or
            guardian must accept these Terms on your behalf.
          </p>

          <h2>3. Subscriptions & Billing</h2>
          <p>
            Plans renew automatically until cancelled. Amounts and billing intervals are shown
            at checkout and on the <Link href="/pricing">Pricing</Link> page. Taxes are handled by Paddle.
          </p>

          <h2>4. Cancellations</h2>
          <p>
            You may cancel anytime via your billing portal link (provided after checkout) or by
            contacting us at {contactEmail}. See our <Link href="/refunds">Refund Policy</Link> for details.
          </p>

          <h2>5. Acceptable Use</h2>
          <ul>
            <li>No illegal, harmful, or abusive activity.</li>
            <li>No collection of payment card numbers or sensitive IDs on calls; we send links instead.</li>
            <li>Respect consent and recording rules in your region.</li>
          </ul>

          <h2>6. Intellectual Property</h2>
          <p>
            All content and software for the Services are owned by {siteName} or our licensors.
            You receive a limited, revocable right to use the Services while compliant with these Terms.
          </p>

          <h2>7. Service Changes</h2>
          <p>
            We may change or discontinue parts of the Services. We’ll give reasonable notice when required.
          </p>

          <h2>8. Disclaimers & Limitation of Liability</h2>
          <p>
            The Services are provided “as is”. To the fullest extent permitted by law, {siteName} and its
            suppliers are not liable for indirect or consequential damages. Our total liability for any claim
            is limited to amounts you paid in the 3 months preceding the event giving rise to the claim.
          </p>

          <h2>9. Contact</h2>
          <p>
            Questions about these Terms? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
