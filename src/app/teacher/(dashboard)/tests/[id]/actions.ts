"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OptionLetter } from "@/types/database";

export interface QuestionEdit {
  category: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionLetter;
}

export async function updateQuestion(testId: string, questionId: string, edit: QuestionEdit) {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").update(edit).eq("id", questionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/tests/${testId}/review`);
}

export async function deleteQuestion(testId: string, questionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/tests/${testId}/review`);
}

export async function publishTest(testId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tests").update({ status: "published" }).eq("id", testId);
  if (error) throw new Error(error.message);
  revalidatePath("/teacher");
}

export async function setResultsReleased(testId: string, released: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("tests").update({ results_released: released }).eq("id", testId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/tests/${testId}/results`);
  revalidatePath("/student/results");
}
