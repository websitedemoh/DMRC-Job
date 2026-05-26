"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applicationFees, categoryLabels, type CandidateCategory } from "@/lib/constants";
import type { ApplicationInput } from "@/lib/validation";

const categories = Object.keys(applicationFees) as CandidateCategory[];

export function ApplicationForm() {
  const router = useRouter();
  const [form, setForm] = useState<ApplicationInput>({
    candidateName: "",
    fatherName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    category: "GEN",
    postApplied: "DMRC Apprentice Information Demo",
    address: ""
  });
  const [error, setError] = useState("");
  const fee = useMemo(() => applicationFees[form.category], [form.category]);

  function updateField(name: keyof ApplicationInput, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.candidateName || !form.fatherName || !form.email || !form.phone || !form.dateOfBirth || !form.address) {
      setError("Please complete all required fields.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, ""))) {
      setError("Please enter a valid 10 digit Indian mobile number.");
      return;
    }

    sessionStorage.setItem("dmrcApplicationDraft", JSON.stringify({ ...form, amount: fee }));
    router.push("/payment");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-black text-ink">Candidate name</span>
          <input
            required
            value={form.candidateName}
            onChange={(event) => updateField("candidateName", event.target.value)}
            className="focus-ring w-full rounded-md border border-slate-300 px-3 py-3"
            placeholder="Enter full name"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-ink">Father name</span>
          <input
            required
            value={form.fatherName}
            onChange={(event) => updateField("fatherName", event.target.value)}
            className="focus-ring w-full rounded-md border border-slate-300 px-3 py-3"
            placeholder="Enter father name"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-ink">Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="focus-ring w-full rounded-md border border-slate-300 px-3 py-3"
            placeholder="candidate@example.com"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-ink">Mobile number</span>
          <input
            required
            inputMode="numeric"
            maxLength={10}
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, ""))}
            className="focus-ring w-full rounded-md border border-slate-300 px-3 py-3"
            placeholder="10 digit mobile number"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-ink">Date of birth</span>
          <input
            required
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => updateField("dateOfBirth", event.target.value)}
            className="focus-ring w-full rounded-md border border-slate-300 px-3 py-3"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-ink">Category</span>
          <select
            value={form.category}
            onChange={(event) => updateField("category", event.target.value as CandidateCategory)}
            className="focus-ring w-full rounded-md border border-slate-300 px-3 py-3"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]} - Rs {applicationFees[category]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-black text-ink">Post applied</span>
          <input
            required
            value={form.postApplied}
            onChange={(event) => updateField("postApplied", event.target.value)}
            className="focus-ring w-full rounded-md border border-slate-300 px-3 py-3"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-black text-ink">Permanent address</span>
          <textarea
            required
            rows={4}
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            className="focus-ring w-full rounded-md border border-slate-300 px-3 py-3"
            placeholder="Enter address"
          />
        </label>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">Application fee</p>
            <p className="mt-1 text-2xl font-black text-ink">Rs {fee}</p>
            <p className="mt-1 text-sm text-slate-600">The server will validate the fee again before creating payment.</p>
          </div>
          <button
            type="submit"
            className="focus-ring rounded-md bg-accent px-5 py-3 text-sm font-black text-white transition hover:bg-teal-800"
          >
            Continue to payment
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
