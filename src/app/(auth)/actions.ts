"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

function dashboardPathForRole(role: UserRole) {
  return role === "student" ? "/student" : "/teacher";
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");

  if (!email || !password || !fullName) {
    redirect(`/signup?error=${encodeURIComponent("All fields are required.")}`);
  }

  // Public self-signup can only ever create students — never trust a role value
  // from the client here. Teacher/admin accounts are promoted separately by
  // trusted server-side code (see the profiles.role column-privilege lockdown
  // in supabase/migrations/0006_lock_profile_role_column.sql).
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: "student" } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // Supabase's anti-enumeration behavior: signUp() for an email that's
  // already registered returns a fake "success" (no error) with an empty
  // identities array, rather than telling the caller the account exists.
  // Without this check, a duplicate signup silently fell through to "check
  // your email to confirm" — no new email is actually sent, so the student
  // was just left confused rather than blocked.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    redirect(`/signup?error=${encodeURIComponent("An account with this email already exists. Log in instead.")}`);
  }

  if (!data.session) {
    redirect("/login?message=Check your email to confirm your account, then log in.");
  }

  redirect(dashboardPathForRole("student"));
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  // Hand-authored Database types can't fully resolve single-column select() generics;
  // this cast is removed once real `supabase gen types` output replaces src/types/database.ts.
  const role = (profile as { role: UserRole } | null)?.role ?? "student";
  redirect(dashboardPathForRole(role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
