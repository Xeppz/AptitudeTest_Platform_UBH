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

  return <VerifyClient testId={test.id} title={test.title} durationMinutes={test.duration_minutes} />;
}
