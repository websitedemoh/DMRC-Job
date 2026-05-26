import { jobHighlights, totalPosts, vacancyRows } from "@/lib/constants";

export function JobSummary() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobHighlights.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-2 text-xl font-black text-ink">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-ink">Vacancy details</h2>
            <p className="mt-1 text-sm text-slate-600">Trade-wise information collected for this demo listing.</p>
          </div>
          <span className="rounded-md bg-accent px-3 py-2 text-sm font-black text-white">{totalPosts} total posts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-5 py-4">Post name</th>
                <th className="border-b border-slate-200 px-5 py-4">No. of posts</th>
                <th className="border-b border-slate-200 px-5 py-4">Eligibility criteria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vacancyRows.map((row) => (
                <tr key={row.postName}>
                  <td className="px-5 py-4 font-bold text-ink">{row.postName}</td>
                  <td className="px-5 py-4 text-slate-700">{row.posts} posts</td>
                  <td className="px-5 py-4 text-slate-700">{row.eligibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
