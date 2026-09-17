import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedProfile, getAuthedUser } from "@/lib/supabase/auth";
import { changePassword } from "./actions";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const profile = await getAuthedProfile(user.id);
  const forced = profile?.must_change_password ?? false;
  const dashboardHref = profile?.role === "student" ? "/student" : "/teacher";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <ThemeToggle className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" />
      <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {forced ? "Set a new password" : "Change password"}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {forced
            ? "Your account was created with a temporary password. Set your own before continuing."
            : "Update the password for your account."}
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <form action={changePassword} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm text-slate-700 dark:text-slate-300">
              Current password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm text-slate-700 dark:text-slate-300">
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-slate-700 dark:text-slate-300">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {forced ? "Set password & continue" : "Save new password"}
          </button>
        </form>

        {!forced && (
          <Link
            href={dashboardHref}
            className="mt-6 block text-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Cancel
          </Link>
        )}
      </div>
    </div>
  );
}
