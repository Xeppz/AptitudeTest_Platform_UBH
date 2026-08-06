import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthedUser } from "@/lib/supabase/auth";
import { computeScore } from "@/lib/scoring";
import { ResultsReleaseToggle } from "./ResultsReleaseToggle";
import type { Answer, Profile, Question, Test, TestSession } from "@/types/database";

export default async function TestResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: testData }, { data: sessionsData }, { data: questionsData }] = await Promise.all([
    supabase.from("tests").select("*").eq("id", id).single(),
    supabase
      .from("test_sessions")
      .select("*")
      .eq("test_id", id)
      .in("status", ["submitted", "auto_submitted"])
      .order("submitted_at", { ascending: false }),
    supabase.from("questions").select("*").eq("test_id", id).order("order_index", { ascending: true }),
  ]);
  const test = testData as Test | null;
  if (!test || test.teacher_id !== user.id) notFound();
  const sessions = (sessionsData as TestSession[] | null) ?? [];
  const questions = (questionsData as Question[] | null) ?? [];

  const studentIds = [...new Set(sessions.map((s) => s.student_id))];
  const sessionIds = sessions.map((s) => s.id);
  const [{ data: profilesData }, { data: answersData }] = await Promise.all([
    studentIds.length > 0
      ? supabase.from("profiles").select("*").in("id", studentIds)
      : Promise.resolve({ data: [] as Profile[] }),
    sessionIds.length > 0
      ? supabase.from("answers").select("*").in("session_id", sessionIds)
      : Promise.resolve({ data: [] as Answer[] }),
  ]);
  const profileById = new Map(((profilesData as Profile[] | null) ?? []).map((p) => [p.id, p]));

  const answersBySessionId = new Map<string, Answer[]>();
  for (const a of (answersData as Answer[] | null) ?? []) {
    const list = answersBySessionId.get(a.session_id) ?? [];
    list.push(a);
    answersBySessionId.set(a.session_id, list);
  }

  return (
    <div>
      <Link href="/teacher" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to dashboard
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-slate-900">{test.title} — results</p>
          <p className="mt-1 text-sm text-slate-500">
            {sessions.length} submission{sessions.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ResultsReleaseToggle testId={test.id} released={test.results_released} />
          {sessions.length > 0 && (
            <a
              href={`/teacher/tests/${id}/results/export`}
              className="rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Download CSV
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-2 font-medium">Student</th>
              <th className="px-4 py-2 font-medium">Score</th>
              <th className="px-4 py-2 font-medium">Violations</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Submitted</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const profile = profileById.get(session.student_id);
              const answers = answersBySessionId.get(session.id) ?? [];
              const score = computeScore(questions, answers, test);
              return (
                <tr key={session.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <p className="font-medium text-slate-900">{profile?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-400">{profile?.email}</p>
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {score.totalScore} / {score.maxScore}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{session.violation_count}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        session.status === "auto_submitted"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {session.status === "auto_submitted" ? "Auto-submitted" : "Submitted"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {session.submitted_at ? new Date(session.submitted_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/teacher/tests/${id}/results/${session.id}`}
                      className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      Report
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
