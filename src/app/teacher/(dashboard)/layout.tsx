import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getAuthedProfile, getAuthedUser } from "@/lib/supabase/auth";
import { SignOutForm } from "@/components/SignOutForm";
import { SidebarNav } from "./SidebarNav";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const profile = await getAuthedProfile(user.id);
  if (profile?.role === "student") redirect("/student");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href="/teacher" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            A
          </span>
          <span className="text-sm font-semibold text-slate-900">AptiTest</span>
        </Link>
        <SignOutForm
          ariaLabel="Log out"
          className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
        >
          <LogOut size={18} />
        </SignOutForm>
      </header>

      <aside className="hidden w-56 flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex">
        <Link href="/teacher" className="mb-8 flex items-center gap-2 px-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            A
          </span>
          <span className="text-sm font-semibold text-slate-900">AptiTest</span>
        </Link>

        <SidebarNav isAdmin={profile?.role === "admin"} />

        <div className="mt-auto">
          <p className="truncate px-3 text-xs text-slate-400">
            {profile?.full_name} · {profile?.role}
          </p>
          <SignOutForm className="mt-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700">
            Log out
          </SignOutForm>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
