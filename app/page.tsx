import Link from "next/link";
import { DisclaimerCard } from "@/components/DisclaimerCard";
import { JobSummary } from "@/components/JobSummary";
import { RouteVisual } from "@/components/RouteVisual";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
        <section className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
            <p className="text-sm font-black uppercase tracking-wide text-accent">Job information demo</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-ink sm:text-5xl">
              DMRC Apprentices Recruitment 2026 information
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
              Review the demo job details, verify all information on the official DMRC website, and continue to the
              sample application flow only after reading the disclaimer.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/apply"
                className="rounded-md bg-accent px-5 py-3 text-sm font-black text-white transition hover:bg-teal-800"
              >
                Start application
              </Link>
              <Link
                href="/payment-status"
                className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black text-ink transition hover:border-accent hover:text-accent"
              >
                Check payment status
              </Link>
            </div>
          </div>

          <DisclaimerCard />
        </section>

        <RouteVisual />
      </div>

      <div className="mt-10">
        <JobSummary />
      </div>
    </div>
  );
}
