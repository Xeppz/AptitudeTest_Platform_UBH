import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthedProfile, getAuthedUser } from "@/lib/supabase/auth";
import type { SessionStatus, Test, TestSession } from "@/types/database";

const STATUS_LABEL: Record<SessionStatus, string> = {
  not_started: "Start test",
  in_progress: "Resume test",
  submitted: "Completed",
  auto_submitted: "Auto-submitted",
};

export default async function StudentDashboard() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [profile, { data: testsData }, { data: sessionsData }] = await Promise.all([
    getAuthedProfile(user.id),
    supabase
      .from("tests")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase.from("test_sessions").select("*").eq("student_id", user.id),
  ]);
  const tests = (testsData as Test[] | null) ?? [];
  const sessions = (sessionsData as TestSession[] | null) ?? [];
  const sessionByTestId = new Map(sessions.map((s) => [s.test_id, s]));

  const completedCount = sessions.filter(
    (s) => s.status === "submitted" || s.status === "auto_submitted",
  ).length;
  const availableCount = tests.filter((t) => {
    const status = sessionByTestId.get(t.id)?.status ?? "not_started";
    return status === "not_started" || status === "in_progress";
  }).length;

  return (
    <div>
      <p className="text-2xl font-semibold text-slate-900">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {availableCount > 0
          ? `You have ${availableCount} test${availableCount === 1 ? "" : "s"} available to take.`
          : "No tests waiting on you right now."}
      </p>

      <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">Available now</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{availableCount}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">Tests completed</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{completedCount}</p>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-medium text-slate-700">Available tests</h2>
      <div className="mt-3 flex flex-col gap-2">
        {tests.map((test) => {
          const status = sessionByTestId.get(test.id)?.status ?? "not_started";
          const done = status === "submitted" || status === "auto_submitted";
          const href = `/student/tests/${test.id}/${done || status === "in_progress" ? "take" : "verify"}`;

          return (
            <div
              key={test.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{test.title}</p>
                <p className="text-xs text-slate-500">{test.duration_minutes} minutes</p>
              </div>
              <Link
                href={href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  done
                    ? "border border-slate-300 text-slate-500 hover:bg-slate-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {STATUS_LABEL[status]}
              </Link>
            </div>
          );
        })}
        {tests.length === 0 && (
          <p className="text-sm text-slate-500">No tests available yet.</p>
        )}
      </div>
    </div>
  );
}
