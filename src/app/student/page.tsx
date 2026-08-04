import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import type { Profile } from "@/types/database";

export default async function StudentDashboard() {
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

  if (profile?.role === "teacher" || profile?.role === "admin") redirect("/teacher");

  return (
    <div className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Student Dashboard</h1>
          <p className="text-sm text-neutral-400">
            Signed in as {profile?.full_name} ({profile?.role})
          </p>
        </div>
        <LogoutButton />
      </div>
      <p className="mt-8 text-neutral-400">
        Assigned tests, pre-test verification, and score reports land here in later steps.
      </p>
    </div>
  );
}
