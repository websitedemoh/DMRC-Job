import { PaymentStatusClient } from "@/components/PaymentStatusClient";

export default async function PaymentStatusPage({
  searchParams
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-black uppercase tracking-wide text-accent">Payment status</p>
        <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">Latest Cashfree order status</h1>
        <p className="mt-3 leading-7 text-slate-700">
          This page checks the backend API, which calls Cashfree directly to verify the latest order status.
        </p>
      </div>

      <PaymentStatusClient orderId={params.order_id} />
    </div>
  );
}
