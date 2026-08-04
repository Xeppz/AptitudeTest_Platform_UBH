"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OptionLetter, TestSession, ViolationType } from "@/types/database";

export async function startSession(testId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: existingData } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("test_id", testId)
    .eq("student_id", user.id)
    .maybeSingle();
  const existing = existingData as TestSession | null;

  if (existing?.status === "submitted" || existing?.status === "auto_submitted") {
    throw new Error("You have already completed this test.");
  }

  if (existing?.status === "in_progress") {
    return { sessionId: existing.id };
  }

  const { data: sessionData, error } = await supabase
    .from("test_sessions")
    .upsert(
      {
        test_id: testId,
        student_id: user.id,
        status: "in_progress",
        camera_verified: true,
        mic_verified: true,
        started_at: new Date().toISOString(),
      },
      { onConflict: "test_id,student_id" },
    )
    .select("id")
    .single();

  const session = sessionData as { id: string } | null;
  if (error || !session) {
    throw new Error(error?.message ?? "Failed to start test session.");
  }
  return { sessionId: session.id };
}

export async function saveAnswer(
  sessionId: string,
  questionId: string,
  selectedOption: OptionLetter | null,
  markedForReview: boolean,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("answers").upsert(
    {
      session_id: sessionId,
      question_id: questionId,
      selected_option: selectedOption,
      marked_for_review: markedForReview,
    },
    { onConflict: "session_id,question_id" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Uses the increment_answer_time RPC (see 0007_add_answer_time_tracking.sql)
 * rather than a plain update(), since this fires on every question switch and
 * a read-then-write from the client would race against itself.
 */
export async function addTimeSpent(sessionId: string, questionId: string, seconds: number) {
  if (seconds <= 0) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_answer_time", {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_seconds: Math.round(seconds),
  });
  if (error) throw new Error(error.message);
}

/**
 * Writes go through the service-role client on purpose — proctoring_logs and
 * violations have no client insert policy, so a student can't tamper with
 * their own flag trail from devtools. Ownership is verified with the
 * caller's own (RLS-scoped) session first.
 */
export async function logViolation(sessionId: string, violationType: ViolationType) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: sessionData } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  const session = sessionData as TestSession | null;
  if (!session || session.student_id !== user.id) {
    throw new Error("Session not found.");
  }
  if (session.status !== "in_progress") {
    return {
      violationCount: session.violation_count,
      maxViolations: 0,
      autoSubmitted: session.status === "auto_submitted",
    };
  }

  const { data: testData } = await supabase
    .from("tests")
    .select("max_violations")
    .eq("id", session.test_id)
    .single();
  const maxViolations = (testData as { max_violations: number } | null)?.max_violations ?? 3;

  const admin = createAdminClient();
  const newCount = session.violation_count + 1;
  const autoSubmit = newCount >= maxViolations;

  await admin.from("proctoring_logs").insert({ session_id: sessionId, event_type: violationType });
  await admin
    .from("violations")
    .insert({ session_id: sessionId, violation_type: violationType, flag_count_at_time: newCount });
  await admin
    .from("test_sessions")
    .update({
      violation_count: newCount,
      ...(autoSubmit
        ? { status: "auto_submitted", submitted_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", sessionId);

  return { violationCount: newCount, maxViolations, autoSubmitted: autoSubmit };
}

export async function submitTest(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: sessionData } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  const session = sessionData as TestSession | null;
  if (!session || session.student_id !== user.id) throw new Error("Session not found.");
  if (session.status !== "in_progress") return;

  const { error } = await supabase
    .from("test_sessions")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}
