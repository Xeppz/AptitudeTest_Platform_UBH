"use server";

import { revalidatePath } from "next/cache";
import { getAuthedProfile, getAuthedUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteStudent(studentId: string) {
  const user = await getAuthedUser();
  if (!user) throw new Error("Not authenticated.");

  const profile = await getAuthedProfile(user.id);
  if (profile?.role !== "admin") throw new Error("Only admins can delete student accounts.");

  const admin = createAdminClient();

  // Scope this action to student accounts only — never let it be used to
  // remove a teacher/admin account, even if a studentId were spoofed.
  const { data: targetData } = await admin.from("profiles").select("role").eq("id", studentId).single();
  const target = targetData as { role: string } | null;
  if (!target || target.role !== "student") {
    throw new Error("Only student accounts can be deleted here.");
  }

  // Deleting the auth user cascades to profiles (0001_init.sql), which in
  // turn cascades to test_sessions/class_students and their dependents
  // (0009_cascade_delete_profile_dependents.sql).
  const { error } = await admin.auth.admin.deleteUser(studentId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/students");
}
