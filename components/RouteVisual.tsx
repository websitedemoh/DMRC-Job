export function RouteVisual() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-soft" aria-hidden="true">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-teal-100" />
      <div className="relative space-y-6">
        {[
          ["Information", "Verify official notice"],
          ["Application", "Submit candidate details"],
          ["Payment", "Secure Cashfree checkout"],
          ["Status", "Confirm latest order state"]
        ].map((step, index) => (
          <div key={step[0]} className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink text-sm font-black text-white">
              {index + 1}
            </div>
            <div>
              <p className="font-black text-ink">{step[0]}</p>
              <p className="text-sm text-slate-500">{step[1]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
