import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseQuestionsText } from "@/lib/questions/parseQuestionsText";
import { STUDENT_YEARS } from "@/lib/studentYear";
import type { Profile, StudentYear } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (data as Pick<Profile, "role"> | null)?.role;
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const durationMinutes = Number(formData.get("durationMinutes") ?? 0);
  const positiveMarks = Number(formData.get("positiveMarks") ?? 1);
  const negativeMarks = Number(formData.get("negativeMarks") ?? 0);
  const maxViolations = Number(formData.get("maxViolations") ?? 3);
  const pastedText = String(formData.get("pastedText") ?? "").trim();
  const targetYearRaw = String(formData.get("targetYear") ?? "");
  const targetYear = (STUDENT_YEARS as string[]).includes(targetYearRaw)
    ? (targetYearRaw as StudentYear)
    : null;

  if (!title || !durationMinutes || durationMinutes <= 0) {
    return NextResponse.json(
      { error: "Title and a positive duration are required." },
      { status: 400 },
    );
  }

  if (!pastedText) {
    return NextResponse.json({ error: "Paste your question text." }, { status: 400 });
  }

  let questions;
  try {
    questions = parseQuestionsText(pastedText);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse questions." },
      { status: 422 },
    );
  }

  const { data: testRow, error: testError } = await supabase
    .from("tests")
    .insert({
      title,
      description,
      teacher_id: user.id,
      duration_minutes: durationMinutes,
      positive_marks: positiveMarks,
      negative_marks: negativeMarks,
      max_violations: maxViolations,
      target_year: targetYear,
      status: "draft",
    })
    .select("id")
    .single();

  const test = testRow as { id: string } | null;
  if (testError || !test) {
    return NextResponse.json(
      { error: testError?.message ?? "Failed to create test." },
      { status: 500 },
    );
  }

  const questionRows = questions.map((q, index) => ({
    test_id: test.id,
    category: q.category,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_option: q.correct_option,
    order_index: index,
  }));

  const { error: questionsError } = await supabase.from("questions").insert(questionRows);
  if (questionsError) {
    return NextResponse.json({ error: questionsError.message }, { status: 500 });
  }

  return NextResponse.json({ testId: test.id });
}
