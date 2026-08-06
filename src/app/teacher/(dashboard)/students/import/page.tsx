import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAuthedProfile, getAuthedUser } from "@/lib/supabase/auth";
import { ImportForm } from "./ImportForm";

export default async function ImportStudentsPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const profile = await getAuthedProfile(user.id);
  if (profile?.role !== "admin") notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/teacher/students" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to students
      </Link>
      <p className="mt-2 text-2xl font-semibold text-slate-900">Import students</p>
      <p className="mt-1 text-sm text-slate-500">
        One student per line: <code className="rounded bg-slate-100 px-1 py-0.5">Full Name, email, Year</code>.
        Year is optional (First/Second/Third Year, or leave it blank). Each account gets a random
        temporary password and must change it on first login — copy the results below before leaving
        this page, they aren&apos;t shown again.
      </p>

      <ImportForm />
    </div>
  );
}
