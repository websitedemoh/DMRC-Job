import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE_DISCLAIMER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "DMRC Job Information Demo",
  description: "Unofficial demo website for DMRC apprentice job information and sample application payment flow."
};

const navigation = [
  { href: "/", label: "Job Info" },
  { href: "/apply", label: "Apply" },
  { href: "/payment", label: "Payment" },
  { href: "/admin", label: "Admin" }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <div className="mx-auto max-w-6xl">
              <strong>Disclaimer:</strong> {SITE_DISCLAIMER}
            </div>
          </div>

          <header className="border-b border-slate-200 bg-white/88 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-lg font-black text-white">
                  M
                </span>
                <span>
                  <span className="block text-lg font-black tracking-normal text-ink">Metro Job Info Demo</span>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Unofficial candidate information site
                  </span>
                </span>
              </Link>

              <nav className="flex flex-wrap gap-2 text-sm font-bold text-slate-700" aria-label="Primary navigation">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 transition hover:border-accent hover:text-accent"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main>{children}</main>

          <footer className="mt-16 border-t border-slate-200 bg-white px-4 py-8 text-sm text-slate-600">
            <div className="mx-auto max-w-6xl">
              <p className="font-semibold text-ink">Unofficial demo website</p>
              <p className="mt-2 max-w-3xl leading-6">
                This website is for demonstration and informational use only. It is not a Delhi Metro Rail Corporation
                Limited website, and it must not be used as a substitute for official notices, official application
                links, or official payment instructions.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
