import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import type { Profile } from "@/types/database";
import { SidebarNav } from "./SidebarNav";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-white px-4 py-5">
        <Link href="/teacher" className="mb-8 flex items-center gap-2 px-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            A
          </span>
          <span className="text-sm font-semibold text-slate-900">AptiTest</span>
        </Link>

        <SidebarNav />

        <div className="mt-auto">
          <p className="truncate px-3 text-xs text-slate-400">
            {profile?.full_name} · {profile?.role}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
