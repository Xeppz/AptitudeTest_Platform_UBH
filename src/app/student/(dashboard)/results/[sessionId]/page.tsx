import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/supabase/auth";
import { computeScore } from "@/lib/scoring";
import { QuestionReviewCard, formatSeconds } from "@/components/QuestionReviewCard";
import type { Answer, Question, Test, TestSession } from "@/types/database";

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: sessionData }, { data: answersData }] = await Promise.all([
    supabase.from("test_sessions").select("*").eq("id", sessionId).single(),
    supabase.from("answers").select("*").eq("session_id", sessionId),
  ]);
  const session = sessionData as TestSession | null;
  if (!session || session.student_id !== user.id) notFound();
  if (session.status !== "submitted" && session.status !== "auto_submitted") notFound();
  const answers = (answersData as Answer[] | null) ?? [];

  // Correct answers only ever get read here after confirming above that this
  // session is the caller's own and already completed.
  const admin = createAdminClient();
  const [{ data: testData }, { data: questionsData }] = await Promise.all([
    supabase.from("tests").select("*").eq("id", session.test_id).single(),
    admin.from("questions").select("*").eq("test_id", session.test_id).order("order_index", { ascending: true }),
  ]);
  const test = testData as Test | null;
  if (!test) notFound();
  const questions = (questionsData as Question[] | null) ?? [];

  const score = computeScore(questions, answers, test);

  const timeByCategory = new Map<string, number>();
  for (const r of score.perQuestion) {
    timeByCategory.set(
      r.question.category,
      (timeByCategory.get(r.question.category) ?? 0) + r.timeSpentSeconds,
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/student/results" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to results
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <p className="text-2xl font-semibold text-slate-900">{test.title}</p>
          <p className="mt-1 text-sm text-slate-500">
            {session.submitted_at ? new Date(session.submitted_at).toLocaleString() : "—"} ·{" "}
            {session.violation_count} violation{session.violation_count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-blue-600">
            {score.totalScore} / {score.maxScore}
          </p>
          <p className="text-xs text-slate-500">
            {score.correctCount} correct · {score.incorrectCount} incorrect · {score.unansweredCount} unanswered
          </p>
        </div>
      </div>

      {timeByCategory.size > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700">Time by category</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {[...timeByCategory.entries()].map(([category, seconds]) => (
              <div key={category} className="text-sm">
                <span className="text-slate-500">{category}: </span>
                <span className="font-medium text-slate-900">{formatSeconds(seconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {score.perQuestion.map((r, index) => (
          <QuestionReviewCard key={r.question.id} result={r} index={index} />
        ))}
      </div>
    </div>
  );
}
