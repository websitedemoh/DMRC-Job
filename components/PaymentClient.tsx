"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";
import { applicationFees, categoryLabels, SITE_DISCLAIMER, type CandidateCategory } from "@/lib/constants";
import type { ApplicationInput } from "@/lib/validation";

type Draft = ApplicationInput & { amount: number };

type CreateOrderResponse = {
  order_id: string;
  payment_session_id: string;
  mode: "sandbox" | "production";
  amount: number;
  error?: string;
};

export function PaymentClient() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [safePaymentConsent, setSafePaymentConsent] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const rawDraft = sessionStorage.getItem("dmrcApplicationDraft");

    if (!rawDraft) {
      return;
    }

    try {
      setDraft(JSON.parse(rawDraft) as Draft);
    } catch {
      sessionStorage.removeItem("dmrcApplicationDraft");
    }
  }, []);

  async function startPayment() {
    if (!draft) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(draft)
      });
      const data = await response.json() as CreateOrderResponse;

      if (!response.ok) {
        throw new Error(data.error || "Could not create payment order.");
      }

      if (!window.Cashfree) {
        throw new Error("Cashfree checkout SDK did not load. Please refresh and try again.");
      }

      const cashfree = window.Cashfree({ mode: data.mode });

      await cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_self"
      });
    } catch (paymentError) {
      setLoading(false);
      setError(paymentError instanceof Error ? paymentError.message : "Payment could not be started.");
    }
  }

  if (!draft) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-black text-ink">No application draft found</h2>
        <p className="mt-2 leading-7 text-slate-700">Please fill the application form before starting payment.</p>
        <Link
          href="/apply"
          className="mt-5 inline-flex rounded-md bg-accent px-5 py-3 text-sm font-black text-white transition hover:bg-teal-800"
        >
          Go to application form
        </Link>
      </div>
    );
  }

  const fee = applicationFees[draft.category as CandidateCategory] ?? draft.amount;
  const canPay = acceptedDisclaimer && safePaymentConsent && sdkReady && !loading;

  return (
    <>
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" onLoad={() => setSdkReady(true)} />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-black text-ink">Review application</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Candidate", draft.candidateName],
              ["Email", draft.email],
              ["Phone", draft.phone],
              ["Category", categoryLabels[draft.category as CandidateCategory] || draft.category],
              ["Post", draft.postApplied],
              ["Fee", `Rs ${fee}`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-soft">
          <h2 className="text-xl font-black">Confirm before payment</h2>
          <p className="mt-3 leading-7">{SITE_DISCLAIMER}</p>
          <p className="mt-4 rounded-md border border-amber-300 bg-white p-4 text-sm font-bold leading-6">
            This payment flow is part of an unofficial demo/information website. Pay only if you understand this is not
            an official DMRC payment portal and you have independently verified details through official sources.
          </p>

          <div className="mt-5 space-y-3">
            <label className="flex gap-3 text-sm font-bold leading-6">
              <input
                type="checkbox"
                checked={acceptedDisclaimer}
                onChange={(event) => setAcceptedDisclaimer(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              I understand this is an unofficial information/demo website.
            </label>
            <label className="flex gap-3 text-sm font-bold leading-6">
              <input
                type="checkbox"
                checked={safePaymentConsent}
                onChange={(event) => setSafePaymentConsent(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              I have verified the details and want to continue to Cashfree checkout.
            </label>
          </div>

          <button
            type="button"
            disabled={!canPay}
            onClick={startPayment}
            className="focus-ring mt-6 w-full rounded-md bg-accent px-5 py-3 text-sm font-black text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Creating secure order..." : sdkReady ? `Pay Rs ${fee}` : "Loading payment gateway..."}
          </button>

          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
