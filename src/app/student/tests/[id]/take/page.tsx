import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Answer, QuestionForStudent, Test, TestSession } from "@/types/database";
import { TestRunner } from "./TestRunner";

export default async function TakeTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: testData } = await supabase.from("tests").select("*").eq("id", id).single();
  const test = testData as Test | null;
  if (!test) notFound();

  const { data: sessionData } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("test_id", id)
    .eq("student_id", user.id)
    .maybeSingle();
  const session = sessionData as TestSession | null;

  if (!session || session.status === "not_started") {
    redirect(`/student/tests/${id}/verify`);
  }

  if (session.status === "submitted" || session.status === "auto_submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-8 text-neutral-100">
        <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-center">
          <h1 className="text-xl font-semibold">
            {session.status === "auto_submitted" ? "Test auto-submitted" : "Test submitted"}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {session.status === "auto_submitted"
              ? "Your test was automatically submitted after reaching the maximum number of proctoring violations."
              : "Your answers have been recorded."}
          </p>
          <Link
            href="/student"
            className="mt-6 inline-block rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Students have no RLS access to questions — fetch with the service-role
  // client and strip correct_option before it ever reaches the client bundle.
  const admin = createAdminClient();
  const { data: questionsData } = await admin
    .from("questions")
    .select("id, test_id, category, question_text, option_a, option_b, option_c, option_d, order_index, marks")
    .eq("test_id", id)
    .order("order_index", { ascending: true });
  const questions = (questionsData as QuestionForStudent[] | null) ?? [];

  const { data: answersData } = await supabase
    .from("answers")
    .select("*")
    .eq("session_id", session.id);
  const answers = (answersData as Answer[] | null) ?? [];

  return (
    <TestRunner
      test={test}
      session={session}
      questions={questions}
      initialAnswers={answers}
    />
  );
}
