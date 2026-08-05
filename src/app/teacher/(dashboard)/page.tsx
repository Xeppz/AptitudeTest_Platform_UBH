import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthedProfile, getAuthedUser } from "@/lib/supabase/auth";
import type { Test } from "@/types/database";

const STATUS_STYLE: Record<Test["status"], string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<Test["status"], string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export default async function TeacherDashboard() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [profile, { data: testsData }] = await Promise.all([
    getAuthedProfile(user.id),
    supabase
      .from("tests")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const tests = (testsData as Test[] | null) ?? [];
  const publishedCount = tests.filter((t) => t.status === "published").length;
  const draftCount = tests.filter((t) => t.status === "draft").length;

  return (
    <div>
      <p className="text-2xl font-semibold text-slate-900">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </p>
      <p className="mt-1 text-sm text-slate-500">Manage your tests and review submissions.</p>

      {profile?.role === "admin" && (
        <Link
          href="/teacher/students"
          className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 hover:underline md:hidden"
        >
          Manage students →
        </Link>
      )}

      <div className="mt-6 grid max-w-md grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
          <p className="text-xs text-slate-500">Total tests</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{tests.length}</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
          <p className="text-xs text-slate-500">Published</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{publishedCount}</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
          <p className="text-xs text-slate-500">Drafts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{draftCount}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-700">Your tests</h2>
        <Link
          href="/teacher/tests/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create test
        </Link>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {tests.map((test) => (
          <div
            key={test.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300"
          >
            <Link href={`/teacher/tests/${test.id}/review`} className="text-sm font-medium text-slate-900">
              {test.title}
            </Link>
            <div className="flex items-center gap-3">
              {test.status === "published" && (
                <Link
                  href={`/teacher/tests/${test.id}/results`}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Results
                </Link>
              )}
              <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[test.status]}`}>
                {STATUS_LABEL[test.status]}
              </span>
            </div>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="text-sm text-slate-500">No tests yet — create your first one above.</p>
        )}
      </div>
    </div>
  );
}
