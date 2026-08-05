import { redirect, notFound } from "next/navigation";
import { getAuthedProfile, getAuthedUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { STUDENT_YEARS, STUDENT_YEAR_LABELS } from "@/lib/studentYear";
import type { Profile, StudentYear, Test, TestSession } from "@/types/database";
import { DeleteStudentButton } from "./DeleteStudentButton";
import { YearFilter } from "./YearFilter";

type StatusTone = "active" | "done" | "idle";

function statusFor(
  studentId: string,
  sessionsByStudent: Map<string, TestSession[]>,
  testTitleById: Map<string, string>,
): { label: string; tone: StatusTone } {
  const sessions = sessionsByStudent.get(studentId) ?? [];

  const inProgress = sessions.find((s) => s.status === "in_progress");
  if (inProgress) {
    return { label: `Taking: ${testTitleById.get(inProgress.test_id) ?? "Untitled test"}`, tone: "active" };
  }

  const completedCount = sessions.filter(
    (s) => s.status === "submitted" || s.status === "auto_submitted",
  ).length;
  if (completedCount > 0) {
    return { label: `${completedCount} test${completedCount === 1 ? "" : "s"} completed`, tone: "done" };
  }

  return { label: "No tests started", tone: "idle" };
}

const TONE_STYLE: Record<StatusTone, string> = {
  active: "bg-emerald-50 text-emerald-700",
  done: "bg-blue-50 text-blue-700",
  idle: "bg-slate-100 text-slate-500",
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const profile = await getAuthedProfile(user.id);
  if (profile?.role !== "admin") notFound();

  const { year: yearParam } = await searchParams;
  const yearFilter = (STUDENT_YEARS as string[]).includes(yearParam ?? "")
    ? (yearParam as StudentYear)
    : null;

  // Service-role client: this page needs visibility across every student and
  // every session regardless of which teacher owns the test, which RLS
  // doesn't grant by default (see supabase/migrations/0001_init.sql). Access
  // is gated above by the admin-role check, not by RLS, on purpose.
  const admin = createAdminClient();
  let studentsQuery = admin
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("created_at", { ascending: false });
  if (yearFilter) studentsQuery = studentsQuery.eq("year", yearFilter);

  const [{ data: studentsData }, { data: sessionsData }, { data: testsData }] = await Promise.all([
    studentsQuery,
    admin.from("test_sessions").select("*"),
    admin.from("tests").select("id, title"),
  ]);
  const students = (studentsData as Profile[] | null) ?? [];
  const sessions = (sessionsData as TestSession[] | null) ?? [];
  const testTitleById = new Map(
    (((testsData as Pick<Test, "id" | "title">[] | null) ?? []).map((t) => [t.id, t.title])),
  );

  const sessionsByStudent = new Map<string, TestSession[]>();
  for (const s of sessions) {
    const list = sessionsByStudent.get(s.student_id) ?? [];
    list.push(s);
    sessionsByStudent.set(s.student_id, list);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-slate-900">Students</p>
          <p className="mt-1 text-sm text-slate-500">
            {students.length} registered student{students.length === 1 ? "" : "s"}
            {yearFilter ? ` · ${STUDENT_YEAR_LABELS[yearFilter]}` : ""}.
          </p>
        </div>
        <YearFilter />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Year</th>
              <th className="px-4 py-2 font-medium">Registered</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const status = statusFor(s.id, sessionsByStudent, testTitleById);
              return (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{s.full_name}</td>
                  <td className="px-4 py-2 text-slate-500">{s.email}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {s.year ? STUDENT_YEAR_LABELS[s.year] : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${TONE_STYLE[status.tone]}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DeleteStudentButton studentId={s.id} studentName={s.full_name} />
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  {yearFilter ? "No students in this year yet." : "No students registered yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
