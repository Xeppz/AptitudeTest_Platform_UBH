import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 text-center">
      <h1 className="text-3xl font-semibold text-neutral-100">Aptitude Test Platform</h1>
      <p className="mt-3 max-w-md text-neutral-400">
        Proctored aptitude tests with automated flagging, category-wise analytics, and teacher
        review tools.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
