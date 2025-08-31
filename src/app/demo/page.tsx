// src/app/demo/page.tsx
import dynamic from "next/dynamic";

const RealtimeCall = dynamic(() => import("@/components/RealtimeCall"), { ssr: false });

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <section className="mx-auto max-w-5xl px-6 pt-14 pb-16">
        <h1 className="text-4xl font-semibold">Live Demo Call</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Your mic stays in the browser; a short-lived session connects to the model.
        </p>
        <div className="mt-6">
          <RealtimeCall />
        </div>
      </section>
    </main>
  );
}
