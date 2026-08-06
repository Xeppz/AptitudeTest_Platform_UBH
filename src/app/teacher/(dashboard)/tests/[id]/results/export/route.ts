import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeScore } from "@/lib/scoring";
import { STUDENT_YEAR_LABELS } from "@/lib/studentYear";
import type { Answer, Profile, Question, Test, TestSession } from "@/types/database";

function csvCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function csvRow(values: (string | number)[]): string {
  return values.map(csvCell).join(",") + "\r\n";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  // Same ownership rule as the results page — no RLS bypass here, this is a
  // regular RLS-scoped client, teacher_id === auth.uid() is what actually gates it.
  if (!test || test.teacher_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  const header = [
    "Name",
    "Email",
    "Year",
    "Score",
    "Max Score",
    "Correct",
    "Incorrect",
    "Unanswered",
    "Violations",
    "Status",
    "Submitted At",
    ...questions.flatMap((_, i) => [`Q${i + 1} Answer`, `Q${i + 1} Correct`]),
  ];

  let csv = csvRow(header);
  for (const session of sessions) {
    const profile = profileById.get(session.student_id);
    const answers = answersBySessionId.get(session.id) ?? [];
    const score = computeScore(questions, answers, test);

    csv += csvRow([
      profile?.full_name ?? "Unknown",
      profile?.email ?? "",
      profile?.year ? STUDENT_YEAR_LABELS[profile.year] : "",
      score.totalScore,
      score.maxScore,
      score.correctCount,
      score.incorrectCount,
      score.unansweredCount,
      session.violation_count,
      session.status === "auto_submitted" ? "Auto-submitted" : "Submitted",
      session.submitted_at ? new Date(session.submitted_at).toLocaleString() : "",
      ...score.perQuestion.flatMap((r) => [
        r.selectedOption ?? "",
        r.isAnswered ? (r.isCorrect ? "Yes" : "No") : "",
      ]),
    ]);
  }

  const filename = `${test.title.replace(/[^a-z0-9]+/gi, "_")}_results.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
