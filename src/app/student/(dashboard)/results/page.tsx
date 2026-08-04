import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeScore } from "@/lib/scoring";
import type { Answer, Question, SessionStatus, Test, TestSession } from "@/types/database";

const STATUS_LABEL: Record<Extract<SessionStatus, "submitted" | "auto_submitted">, string> = {
  submitted: "Submitted",
  auto_submitted: "Auto-submitted",
};

export default async function ResultsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessionsData } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("student_id", user.id)
    .in("status", ["submitted", "auto_submitted"])
    .order("submitted_at", { ascending: false });
  const sessions = (sessionsData as TestSession[] | null) ?? [];

  const testIds = [...new Set(sessions.map((s) => s.test_id))];
  const sessionIds = sessions.map((s) => s.id);

  const { data: testsData } =
    testIds.length > 0
      ? await supabase.from("tests").select("*").in("id", testIds)
      : { data: [] as Test[] };
  const testById = new Map(((testsData as Test[] | null) ?? []).map((t) => [t.id, t]));

  // Correct answers are never exposed to a client-side query (see the questions
  // RLS policy) — safe to read here with the admin client since we only ever
  // do this for sessions already confirmed submitted/auto_submitted above.
  const admin = createAdminClient();
  const { data: questionsData } =
    testIds.length > 0 ? await admin.from("questions").select("*").in("test_id", testIds) : { data: [] as Question[] };
  const questionsByTestId = new Map<string, Question[]>();
  for (const q of (questionsData as Question[] | null) ?? []) {
    const list = questionsByTestId.get(q.test_id) ?? [];
    list.push(q);
    questionsByTestId.set(q.test_id, list);
  }

  const { data: answersData } =
    sessionIds.length > 0
      ? await supabase.from("answers").select("*").in("session_id", sessionIds)
      : { data: [] as Answer[] };
  const answersBySessionId = new Map<string, Answer[]>();
  for (const a of (answersData as Answer[] | null) ?? []) {
    const list = answersBySessionId.get(a.session_id) ?? [];
    list.push(a);
    answersBySessionId.set(a.session_id, list);
  }

  return (
    <div>
      <p className="text-2xl font-semibold text-slate-900">My results</p>
      <p className="mt-1 text-sm text-slate-500">Completed tests, scores, and proctoring flags.</p>

      <div className="mt-6 flex flex-col gap-2">
        {sessions.map((session) => {
          const test = testById.get(session.test_id);
          const questions = questionsByTestId.get(session.test_id) ?? [];
          const answers = answersBySessionId.get(session.id) ?? [];
          const score = test ? computeScore(questions, answers, test) : null;

          return (
            <Link
              key={session.id}
              href={`/student/results/${session.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{test?.title ?? "Untitled test"}</p>
                <p className="text-xs text-slate-500">
                  {session.submitted_at ? new Date(session.submitted_at).toLocaleDateString() : "—"} ·{" "}
                  {session.violation_count} violation{session.violation_count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {score && (
                  <span className="text-sm font-semibold text-blue-600">
                    {score.totalScore} / {score.maxScore}
                  </span>
                )}
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    session.status === "auto_submitted"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {STATUS_LABEL[session.status as "submitted" | "auto_submitted"]}
                </span>
              </div>
            </Link>
          );
        })}
        {sessions.length === 0 && (
          <p className="text-sm text-slate-500">No completed tests yet.</p>
        )}
      </div>
    </div>
  );
}
