import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { SITE_NAME, TMDB_ATTRIBUTION } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: `${SITE_NAME} — every streaming release date, automatically tracked`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Automated tracker for streaming release dates across Netflix, Prime Video, Disney+, JioHotstar, SonyLIV, Zee5 and more — global and India regional languages.",
  verification: {
    google: "MSnXIkPiwpkgU34JXcQFq4txCXbZuSSCsSYOBvSbkAw",
  },
  other: {
    monetag: "8da077af9a08b6dd63958fbcdd6f7d2e",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              {SITE_NAME}
            </Link>
            <Link
              href="/about"
              className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            >
              About
            </Link>
            <Link
              href="/platform"
              className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            >
              Platforms
            </Link>
            <Link
              href="/country"
              className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            >
              Countries
            </Link>
            <Link
              href="/language"
              className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            >
              Languages
            </Link>
          </nav>
          <div className="mx-auto max-w-5xl px-4 pb-3">
            <AdSlot slot="header" className="h-[90px]" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="mb-4">
              <AdSlot slot="footer" className="h-[90px]" />
            </div>
            <p>{TMDB_ATTRIBUTION}</p>
            <p className="mt-2">
              Release data via the{" "}
              <a
                href="https://www.themoviedb.org/"
                rel="noopener noreferrer"
                className="underline"
              >
                TMDB API
              </a>
              . Articles are auto-generated from TMDB metadata.{" "}
              <Link href="/about" className="underline">
                How this site works
              </Link>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
