import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Test } from "@/types/database";
import { VerifyClient } from "./VerifyClient";

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("tests").select("*").eq("id", id).single();
  const test = data as Test | null;
  if (!test || test.status !== "published") notFound();

  const now = new Date().getTime();
  const notYetOpen = test.starts_at && now < new Date(test.starts_at).getTime();
  const alreadyClosed = test.ends_at && now > new Date(test.ends_at).getTime();
  if (notYetOpen || alreadyClosed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">{test.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {notYetOpen
              ? `This test opens at ${new Date(test.starts_at as string).toLocaleString()}.`
              : `This test closed at ${new Date(test.ends_at as string).toLocaleString()}.`}
          </p>
          <a
            href="/student"
            className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  return <VerifyClient testId={test.id} title={test.title} durationMinutes={test.duration_minutes} />;
}
