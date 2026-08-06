"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

export async function changePassword(formData: FormData) {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) {
    redirect(`/change-password?error=${encodeURIComponent("Enter your current password.")}`);
  }
  if (newPassword.length < 6) {
    redirect(`/change-password?error=${encodeURIComponent("New password must be at least 6 characters.")}`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/change-password?error=${encodeURIComponent("New passwords do not match.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  // An active session alone isn't proof the caller should be able to lock
  // the real account owner out — re-authenticating with the current
  // password first is what actually enforces that. (The forgot-password
  // recovery flow deliberately doesn't go through here — see /reset-password
  // — since that user by definition doesn't know their current password.)
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    redirect(`/change-password?error=${encodeURIComponent("Current password is incorrect.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    redirect(`/change-password?error=${encodeURIComponent(error.message)}`);
  }

  // Cleared via the admin client rather than a client-writable column grant
  // — this only runs after auth.updateUser() above actually succeeded, so
  // there's no way to clear the flag without genuinely setting a new password.
  const admin = createAdminClient();
  await admin.from("profiles").update({ must_change_password: false }).eq("id", user.id);

  const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profileData as { role: UserRole } | null)?.role ?? "student";
  redirect(role === "student" ? "/student" : "/teacher");
}
