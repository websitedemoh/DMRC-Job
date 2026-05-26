import { PaymentClient } from "@/components/PaymentClient";

export default function PaymentPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-black uppercase tracking-wide text-accent">Payment</p>
        <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">Review and pay safely</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-700">
          The backend creates the Cashfree order and returns only the payment session id to this page. Secret keys never
          enter browser code.
        </p>
      </div>

      <PaymentClient />
    </div>
  );
}
