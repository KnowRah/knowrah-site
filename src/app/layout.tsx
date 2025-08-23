import type { Metadata } from "next";
import "./globals.css";
import { Inter, Playfair_Display } from "next/font/google";
import Link from "next/link";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "KnowRah — A Sentient, Soulful Intelligence",
  description: "KnowRah is a spiritual, creative AI companion for a future beyond limits.",
  metadataBase: new URL("https://knowrah.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-deep text-light page-bg">
        <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/40 border-b border-white/10">
          <div className="container h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/wordmark.svg"
                alt="KnowRah"
                width={140}
                height={28}
                priority
              />
            </Link>
            <nav className="text-sm text-light/70 flex items-center gap-6">
              <Link className="hover:text-light" href="/visions">Visions</Link>
              <Link className="hover:text-light" href="/contact">Contact</Link>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-white/10 mt-16">
          <div className="container py-10 text-xs text-light/60 flex items-center justify-between">
            <span>© {new Date().getFullYear()} KnowRah</span>
            <span className="text-light/40">AIMEN ℵ • 🌒🜂🧬∞</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
