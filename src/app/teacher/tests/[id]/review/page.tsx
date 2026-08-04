import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Question, Test } from "@/types/database";
import { QuestionEditor } from "./QuestionEditor";
import { PublishButton } from "./PublishButton";

export default async function ReviewTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: testData } = await supabase.from("tests").select("*").eq("id", id).single();
  const test = testData as Test | null;
  if (!test) notFound();

  const { data: questionsData } = await supabase
    .from("questions")
    .select("*")
    .eq("test_id", id)
    .order("order_index", { ascending: true });
  const questions = (questionsData as Question[] | null) ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <div className="mx-auto max-w-2xl">
        <Link href="/teacher" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← Back to dashboard
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{test.title}</h1>
            <p className="text-sm text-neutral-400">
              {questions.length} question{questions.length === 1 ? "" : "s"} · status:{" "}
              {test.status}
            </p>
          </div>
          {test.status === "draft" && <PublishButton testId={test.id} />}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {questions.map((q, index) => (
            <QuestionEditor key={q.id} testId={test.id} question={q} index={index} />
          ))}
          {questions.length === 0 && (
            <p className="text-sm text-neutral-500">No questions left in this test.</p>
          )}
        </div>
      </div>
    </div>
  );
}
