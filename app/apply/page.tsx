import { ApplicationForm } from "@/components/ApplicationForm";
import { DisclaimerCard } from "@/components/DisclaimerCard";

export default function ApplyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-black uppercase tracking-wide text-accent">Application form</p>
        <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">Candidate details</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-700">
          Submit the candidate information for the demo flow. The payment amount is calculated from category on the
          server, not from editable browser fields.
        </p>
      </div>

      <div className="mb-8">
        <DisclaimerCard />
      </div>

      <ApplicationForm />
    </div>
  );
}
