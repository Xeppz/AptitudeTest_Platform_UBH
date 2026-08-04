import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeScore } from "@/lib/scoring";
import type { Answer, OptionLetter, Question, Test, TestSession } from "@/types/database";

const OPTION_LETTERS: OptionLetter[] = ["A", "B", "C", "D"];

function formatSeconds(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessionData } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  const session = sessionData as TestSession | null;
  if (!session || session.student_id !== user.id) notFound();
  if (session.status !== "submitted" && session.status !== "auto_submitted") notFound();

  const { data: testData } = await supabase.from("tests").select("*").eq("id", session.test_id).single();
  const test = testData as Test | null;
  if (!test) notFound();

  // Correct answers only ever get read here after confirming above that this
  // session is the caller's own and already completed.
  const admin = createAdminClient();
  const { data: questionsData } = await admin
    .from("questions")
    .select("*")
    .eq("test_id", session.test_id)
    .order("order_index", { ascending: true });
  const questions = (questionsData as Question[] | null) ?? [];

  const { data: answersData } = await supabase.from("answers").select("*").eq("session_id", sessionId);
  const answers = (answersData as Answer[] | null) ?? [];

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
          <div key={r.question.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Question {index + 1} · {r.question.category}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">{formatSeconds(r.timeSpentSeconds)}</span>
                <span
                  className={`rounded-md px-2 py-0.5 font-medium ${
                    r.isCorrect
                      ? "bg-emerald-50 text-emerald-700"
                      : r.isAnswered
                        ? "bg-red-50 text-red-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r.isCorrect ? "Correct" : r.isAnswered ? "Incorrect" : "Unanswered"} ·{" "}
                  {r.marksAwarded >= 0 ? "+" : ""}
                  {r.marksAwarded}
                </span>
              </div>
            </div>

            <p className="mt-2 text-sm text-slate-900">{r.question.question_text}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OPTION_LETTERS.map((letter) => {
                const key = `option_${letter.toLowerCase()}` as keyof Question;
                const isCorrectOption = letter === r.question.correct_option;
                const isSelected = letter === r.selectedOption;
                return (
                  <div
                    key={letter}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      isCorrectOption
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : isSelected
                          ? "border-red-300 bg-red-50 text-red-800"
                          : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <span className="mr-2 text-slate-400">{letter}</span>
                    {r.question[key] as string}
                    {isCorrectOption && <span className="ml-2 text-xs">(correct)</span>}
                    {isSelected && !isCorrectOption && <span className="ml-2 text-xs">(your answer)</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
