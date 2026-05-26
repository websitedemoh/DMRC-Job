"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StatusResponse = {
  order_id: string;
  payment_status: "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "UNKNOWN";
  cashfree_status: string;
  amount?: number;
  currency?: string;
  error?: string;
};

export function PaymentStatusClient({ orderId }: { orderId?: string }) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const safeOrderId = orderId;

    async function loadStatus() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/payment-status?order_id=${encodeURIComponent(safeOrderId)}`, {
          cache: "no-store"
        });
        const data = await response.json() as StatusResponse;

        if (!response.ok) {
          throw new Error(data.error || "Could not load payment status.");
        }

        setStatus(data);
      } catch (statusError) {
        setError(statusError instanceof Error ? statusError.message : "Could not load payment status.");
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-black text-ink">Enter an order id</h2>
        <p className="mt-2 text-slate-700">Payment status needs an order id from Cashfree checkout.</p>
      </div>
    );
  }

  const tone =
    status?.payment_status === "PAID"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : status?.payment_status === "FAILED" || status?.payment_status === "CANCELLED"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <div className={`rounded-lg border p-6 shadow-soft ${tone}`}>
      <p className="text-sm font-black uppercase tracking-wide">Order status</p>
      <h2 className="mt-2 text-3xl font-black">
        {loading ? "Checking payment..." : status?.payment_status || "Status unavailable"}
      </h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md bg-white/70 p-4">
          <dt className="text-xs font-black uppercase tracking-wide opacity-70">Order id</dt>
          <dd className="mt-1 break-all font-bold">{orderId}</dd>
        </div>
        <div className="rounded-md bg-white/70 p-4">
          <dt className="text-xs font-black uppercase tracking-wide opacity-70">Cashfree status</dt>
          <dd className="mt-1 font-bold">{status?.cashfree_status || "Pending check"}</dd>
        </div>
        <div className="rounded-md bg-white/70 p-4">
          <dt className="text-xs font-black uppercase tracking-wide opacity-70">Amount</dt>
          <dd className="mt-1 font-bold">{status?.amount ? `Rs ${status.amount}` : "Not available"}</dd>
        </div>
      </dl>

      {error ? <p className="mt-5 rounded-md bg-white/80 p-4 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/apply" className="rounded-md bg-white px-4 py-2 text-sm font-black text-ink">
          New application
        </Link>
        <Link href="/" className="rounded-md border border-white/70 px-4 py-2 text-sm font-black">
          Back to job info
        </Link>
      </div>
    </div>
  );
}
