"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

export async function changePassword(formData: FormData) {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 6) {
    redirect(`/change-password?error=${encodeURIComponent("Password must be at least 6 characters.")}`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/change-password?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
