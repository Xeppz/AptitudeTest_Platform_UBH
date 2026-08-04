import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-semibold text-white">
        A
      </div>
      <h1 className="text-3xl font-semibold text-slate-900">Aptitude Test Platform</h1>
      <p className="mt-3 max-w-md text-slate-500">
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
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
