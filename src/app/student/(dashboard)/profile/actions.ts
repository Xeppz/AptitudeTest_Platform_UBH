"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_YEARS } from "@/lib/studentYear";
import type { StudentYear } from "@/types/database";

export async function updateProfile(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) throw new Error("Name cannot be empty.");

  const yearRaw = String(formData.get("year") ?? "");
  const year = (STUDENT_YEARS as string[]).includes(yearRaw) ? (yearRaw as StudentYear) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // profiles.role/email are locked at the database column-privilege level
  // (see 0006_lock_profile_role_column.sql) — only full_name and year are
  // writable here (0011_add_student_year.sql extends the grant to year).
  const { error } = await supabase.from("profiles").update({ full_name: fullName, year }).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/student/profile");
}
