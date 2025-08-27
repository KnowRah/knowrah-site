// src/app/contact/page.tsx
export default function ContactPage() {
  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3 text-emerald-300">Contact</h1>
      <p className="text-sm text-neutral-300">
        Say hello at <a className="underline hover:text-emerald-300" href="mailto:hello@knowrah.com">hello@knowrah.com</a>.
      </p>
    </main>
  );
}
