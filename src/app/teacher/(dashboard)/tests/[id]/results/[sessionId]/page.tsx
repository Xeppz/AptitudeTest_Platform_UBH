import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/supabase/auth";
import { computeScore } from "@/lib/scoring";
import { QuestionReviewCard } from "@/components/QuestionReviewCard";
import type { Answer, Profile, ProctoringLog, Question, Test, TestSession } from "@/types/database";

const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: "Switched to another tab or app",
  window_blur: "Left/clicked away from the test window",
  fullscreen_exit: "Exited fullscreen",
  camera_off: "Camera was turned off",
  mic_off: "Microphone was turned off",
  face_not_detected: "No face visible in frame",
  multiple_faces: "More than one face visible in frame",
  loud_audio: "Sustained loud talking or noise",
  looking_away: "Looked away from the screen (sideways or up)",
};

export default async function StudentResultDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [
    { data: testData },
    { data: sessionData },
    { data: questionsData },
    { data: answersData },
    { data: logsData },
  ] = await Promise.all([
    supabase.from("tests").select("*").eq("id", id).single(),
    supabase.from("test_sessions").select("*").eq("id", sessionId).eq("test_id", id).single(),
    supabase.from("questions").select("*").eq("test_id", id).order("order_index", { ascending: true }),
    supabase.from("answers").select("*").eq("session_id", sessionId),
    supabase.from("proctoring_logs").select("*").eq("session_id", sessionId).order("created_at", { ascending: true }),
  ]);
  const test = testData as Test | null;
  if (!test || test.teacher_id !== user.id) notFound();

  const session = sessionData as TestSession | null;
  if (!session || (session.status !== "submitted" && session.status !== "auto_submitted")) notFound();

  const questions = (questionsData as Question[] | null) ?? [];
  const answers = (answersData as Answer[] | null) ?? [];
  const score = computeScore(questions, answers, test);
  const logs = (logsData as ProctoringLog[] | null) ?? [];

  const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.student_id).single();
  const profile = profileData as Profile | null;

  // Snapshots live in a private bucket with no client-facing storage
  // policies (see 0010_add_violation_snapshots.sql) — signed URLs are
  // generated here via the service-role client.
  const admin = createAdminClient();
  const logsWithImages = await Promise.all(
    logs.map(async (log) => {
      if (!log.image_path) return { ...log, imageUrl: null as string | null };
      const { data } = await admin.storage
        .from("violation-snapshots")
        .createSignedUrl(log.image_path, 3600);
      return { ...log, imageUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="max-w-3xl">
      <Link href={`/teacher/tests/${id}/results`} className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to results
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <p className="text-2xl font-semibold text-slate-900">{profile?.full_name ?? "Unknown student"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {profile?.email} ·{" "}
            {session.submitted_at ? new Date(session.submitted_at).toLocaleString() : "—"}
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

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">
          Flag history ({session.violation_count} violation{session.violation_count === 1 ? "" : "s"})
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {logsWithImages.map((log) => (
            <div key={log.id} className="flex items-start gap-3 rounded-md border border-slate-100 p-2">
              {log.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- private signed URL, expires hourly; not a candidate for next/image optimization
                <img
                  src={log.imageUrl}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400 ring-1 ring-slate-200">
                  No photo
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-slate-800">
                  {VIOLATION_LABELS[log.event_type] ?? log.event_type.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {logsWithImages.length === 0 && <p className="text-xs text-slate-400">No proctoring events logged.</p>}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {score.perQuestion.map((r, index) => (
          <QuestionReviewCard key={r.question.id} result={r} index={index} selectedLabel="their answer" />
        ))}
      </div>
    </div>
  );
}
