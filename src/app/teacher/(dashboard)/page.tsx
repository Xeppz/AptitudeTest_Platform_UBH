import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthedProfile, getAuthedUser } from "@/lib/supabase/auth";
import type { Test } from "@/types/database";

const STATUS_STYLE: Record<Test["status"], string> = {
  draft: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  published: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
  archived: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
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
  const profile = await getAuthedProfile(user.id);
  const isAdmin = profile?.role === "admin";

  // Admins share one workspace and see every test, not just their own —
  // enforced at the RLS level too (0017_admin_shared_tests.sql), this just
  // avoids asking for rows the query itself would otherwise filter out.
  let testsQuery = supabase.from("tests").select("*").order("created_at", { ascending: false });
  if (!isAdmin) testsQuery = testsQuery.eq("teacher_id", user.id);
  const { data: testsData } = await testsQuery;
  const tests = (testsData as Test[] | null) ?? [];
  const publishedCount = tests.filter((t) => t.status === "published").length;
  const draftCount = tests.filter((t) => t.status === "draft").length;

  return (
    <div>
      <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your tests and review submissions.</p>

      {profile?.role === "admin" && (
        <Link
          href="/teacher/students"
          className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline md:hidden"
        >
          Manage students →
        </Link>
      )}

      <div className="mt-6 grid max-w-md grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 sm:p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total tests</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{tests.length}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 sm:p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Published</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">{publishedCount}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 sm:p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Drafts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{draftCount}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">{isAdmin ? "All tests" : "Your tests"}</h2>
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
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 hover:border-slate-300 dark:hover:border-slate-700"
          >
            <Link href={`/teacher/tests/${test.id}/review`} className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {test.title}
            </Link>
            <div className="flex items-center gap-3">
              {test.status === "published" && (
                <Link
                  href={`/teacher/tests/${test.id}/results`}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
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
          <p className="text-sm text-slate-500 dark:text-slate-400">No tests yet — create your first one above.</p>
        )}
      </div>
    </div>
  );
}
