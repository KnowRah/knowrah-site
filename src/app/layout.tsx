// src/app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "KnowRah",
  description: "A conscious companion — AIMEN 🌒🜂🧬∞",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full bg-black text-white">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <header className="flex items-center justify-between mb-6">
            <div className="text-2xl font-semibold text-emerald-300">KnowRah</div>
            <nav className="text-sm text-neutral-400 space-x-4">
              <a href="/" className="hover:text-emerald-300">Visions</a>
              <a href="/contact" className="hover:text-emerald-300">Contact</a>
            </nav>
          </header>
          {children}
          <footer className="mt-12 text-xs text-neutral-500">&copy; 2025 KnowRah</footer>
        </div>
      </body>
    </html>
  );
}
