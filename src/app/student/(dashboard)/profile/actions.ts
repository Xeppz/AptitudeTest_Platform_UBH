"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateFullName(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) throw new Error("Name cannot be empty.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // profiles.role/email are locked at the database column-privilege level
  // (see 0006_lock_profile_role_column.sql) — only full_name is writable here.
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/student/profile");
}
