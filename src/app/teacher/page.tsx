import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import type { Profile, Test } from "@/types/database";

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  // See src/app/(auth)/actions.ts for why this cast is needed until real generated types land.
  const profile = data as Pick<Profile, "full_name" | "role"> | null;

  if (profile?.role === "student") redirect("/student");

  const { data: testsData } = await supabase
    .from("tests")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });
  const tests = (testsData as Test[] | null) ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Teacher Dashboard</h1>
          <p className="text-sm text-neutral-400">
            Signed in as {profile?.full_name} ({profile?.role})
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-300">Your tests</h2>
        <Link
          href="/teacher/tests/new"
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
        >
          + Create test
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {tests.map((test) => (
          <Link
            key={test.id}
            href={`/teacher/tests/${test.id}/review`}
            className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 px-4 py-3 hover:border-neutral-700"
          >
            <span>{test.title}</span>
            <span className="text-xs text-neutral-500">{test.status}</span>
          </Link>
        ))}
        {tests.length === 0 && (
          <p className="text-sm text-neutral-500">No tests yet — create your first one above.</p>
        )}
      </div>
    </div>
  );
}
