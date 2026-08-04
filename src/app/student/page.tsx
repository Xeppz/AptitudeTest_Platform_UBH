import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import type { Profile, SessionStatus, Test, TestSession } from "@/types/database";

const STATUS_LABEL: Record<SessionStatus, string> = {
  not_started: "Start test",
  in_progress: "Resume test",
  submitted: "Completed",
  auto_submitted: "Auto-submitted",
};

export default async function StudentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  // See src/app/(auth)/actions.ts for why this cast is needed until real generated types land.
  const profile = data as Pick<Profile, "full_name" | "role"> | null;

  if (profile?.role === "teacher" || profile?.role === "admin") redirect("/teacher");

  const { data: testsData } = await supabase
    .from("tests")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const tests = (testsData as Test[] | null) ?? [];

  const { data: sessionsData } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("student_id", user.id);
  const sessions = (sessionsData as TestSession[] | null) ?? [];
  const sessionByTestId = new Map(sessions.map((s) => [s.test_id, s]));

  return (
    <div className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Student Dashboard</h1>
          <p className="text-sm text-neutral-400">
            Signed in as {profile?.full_name} ({profile?.role})
          </p>
        </div>
        <LogoutButton />
      </div>

      <h2 className="mt-8 text-sm font-medium text-neutral-300">Available tests</h2>
      <div className="mt-4 flex flex-col gap-2">
        {tests.map((test) => {
          const status = sessionByTestId.get(test.id)?.status ?? "not_started";
          const done = status === "submitted" || status === "auto_submitted";
          const href = done
            ? `/student/tests/${test.id}/take`
            : status === "in_progress"
              ? `/student/tests/${test.id}/take`
              : `/student/tests/${test.id}/verify`;

          return (
            <div
              key={test.id}
              className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <div>
                <p className="text-sm text-neutral-100">{test.title}</p>
                <p className="text-xs text-neutral-500">{test.duration_minutes} minutes</p>
              </div>
              <Link
                href={href}
                className={`rounded px-3 py-1.5 text-xs font-medium ${
                  done
                    ? "border border-neutral-700 text-neutral-400 hover:bg-neutral-800"
                    : "bg-neutral-100 text-neutral-900 hover:bg-white"
                }`}
              >
                {STATUS_LABEL[status]}
              </Link>
            </div>
          );
        })}
        {tests.length === 0 && (
          <p className="text-sm text-neutral-500">No tests available yet.</p>
        )}
      </div>
    </div>
  );
}
