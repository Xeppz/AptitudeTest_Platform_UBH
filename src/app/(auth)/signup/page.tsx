import Link from "next/link";
import { signUp } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900 p-8">
        <h1 className="text-xl font-semibold text-neutral-100">Sign up</h1>
        <p className="mt-1 text-sm text-neutral-400">Aptitude Test Platform</p>

        {error && (
          <p className="mt-4 rounded border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <form action={signUp} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="fullName" className="block text-sm text-neutral-300">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-neutral-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-neutral-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          Already have an account?{" "}
          <Link href="/login" className="text-neutral-200 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
