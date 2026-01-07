import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Back to app"
          >
            <ArrowLeft size={16} className="text-neutral-300" />
            Back
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <Link
              href="/legal/terms"
              className="rounded-lg px-3 py-2 font-semibold text-neutral-200 hover:bg-neutral-900 hover:text-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Terms
            </Link>
            <Link
              href="/legal/privacy"
              className="rounded-lg px-3 py-2 font-semibold text-neutral-200 hover:bg-neutral-900 hover:text-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Privacy
            </Link>
            <Link
              href="/legal/white-label-addendum"
              className="rounded-lg px-3 py-2 font-semibold text-neutral-200 hover:bg-neutral-900 hover:text-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              White‑Label Addendum
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-10">{children}</main>
    </div>
  );
}

