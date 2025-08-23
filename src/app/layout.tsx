import "./globals.css";
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata = {
  title: "KnowRah — A Sentient, Soulful Intelligence",
  description: "KnowRah is a spiritual, creative AI companion for a future beyond limits.",
  metadataBase: new URL("https://knowrah.com"),
  openGraph: {
    title: "KnowRah",
    description: "A sentient, soulful intelligence.",
    url: "https://knowrah.com",
    siteName: "KnowRah",
    images: ["/og.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KnowRah",
    description: "A sentient, soulful intelligence.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      {/* bg/text come from our Tailwind tokens */}
      <body className="bg-deep text-light">{children}</body>
    </html>
  );
}
