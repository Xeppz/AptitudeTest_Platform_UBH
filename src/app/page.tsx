import Link from "next/link";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white dark:bg-slate-900 px-4 text-center">
      <ParticleBackground />
      <ThemeToggle className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-semibold text-white">
          A
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Aptitude Test Platform</h1>
        <p className="mt-3 max-w-md text-slate-500 dark:text-slate-400">
          Proctored aptitude tests with automated flagging, category-wise analytics, and teacher
          review tools.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
