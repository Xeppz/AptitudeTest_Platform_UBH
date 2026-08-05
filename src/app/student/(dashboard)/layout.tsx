import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import type { Profile } from "@/types/database";
import { SidebarNav } from "./SidebarNav";
import { BottomNav } from "./BottomNav";

export default async function StudentDashboardLayout({
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
  if (profile?.role === "teacher" || profile?.role === "admin") redirect("/teacher");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      {/* Mobile top bar — sidebar is desktop-only, this replaces it above md */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href="/student" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            A
          </span>
          <span className="text-sm font-semibold text-slate-900">AptiTest</span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <LogOut size={18} />
          </button>
        </form>
      </header>

      <aside className="hidden w-56 flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex">
        <Link href="/student" className="mb-8 flex items-center gap-2 px-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            A
          </span>
          <span className="text-sm font-semibold text-slate-900">AptiTest</span>
        </Link>

        <SidebarNav />

        <div className="mt-auto">
          <p className="truncate px-3 text-xs text-slate-400">{profile?.full_name}</p>
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

      <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">{children}</main>

      <BottomNav />
    </div>
  );
}
