"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function resetPassword(formData: FormData) {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 6) {
    redirect(`/reset-password?error=${encodeURIComponent("Password must be at least 6 characters.")}`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // No active session means the recovery link's one-time token was already
  // used or has expired — there's nothing to reset here.
  if (!user) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("That reset link is invalid or expired. Request a new one.")}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profileData as { role: UserRole } | null)?.role ?? "student";
  redirect(role === "student" ? "/student" : "/teacher");
}
