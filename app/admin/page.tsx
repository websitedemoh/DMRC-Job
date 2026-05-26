import { AdminApplications } from "@/components/AdminApplications";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-black uppercase tracking-wide text-accent">Admin</p>
        <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">Application list</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-700">
          Protected by the simple ADMIN_PASSWORD environment variable. For production, replace this with real
          authentication and a persistent database such as Supabase.
        </p>
      </div>

      <AdminApplications />
    </div>
  );
}
