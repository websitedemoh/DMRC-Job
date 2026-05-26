"use client";

import { useState } from "react";
import type { ApplicationRecord } from "@/lib/store";

export function AdminApplications() {
  const [password, setPassword] = useState("");
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadApplications(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });
      const data = await response.json() as { applications?: ApplicationRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not load applications.");
      }

      setApplications(data.applications || []);
    } catch (adminError) {
      setError(adminError instanceof Error ? adminError.message : "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={loadApplications} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <label className="block space-y-2">
          <span className="text-sm font-black text-ink">Admin password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="focus-ring w-full max-w-md rounded-md border border-slate-300 px-3 py-3"
            placeholder="Enter ADMIN_PASSWORD"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="focus-ring mt-4 rounded-md bg-accent px-5 py-3 text-sm font-black text-white transition hover:bg-teal-800 disabled:bg-slate-400"
        >
          {loading ? "Loading..." : "Load applications"}
        </button>
        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-xl font-black text-ink">Applications</h2>
          <p className="mt-1 text-sm text-slate-600">JSON placeholder storage for demo/admin review.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Created</th>
                <th className="border-b border-slate-200 px-4 py-3">Candidate</th>
                <th className="border-b border-slate-200 px-4 py-3">Contact</th>
                <th className="border-b border-slate-200 px-4 py-3">Order</th>
                <th className="border-b border-slate-200 px-4 py-3">Amount</th>
                <th className="border-b border-slate-200 px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length ? (
                applications.map((application) => (
                  <tr key={application.id}>
                    <td className="px-4 py-3 text-slate-600">{new Date(application.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-ink">{application.applicant.candidateName}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {application.applicant.email}
                      <br />
                      {application.applicant.phone}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{application.orderId}</td>
                    <td className="px-4 py-3 text-slate-700">Rs {application.amount}</td>
                    <td className="px-4 py-3 font-black text-ink">{application.paymentStatus}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    No applications loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
