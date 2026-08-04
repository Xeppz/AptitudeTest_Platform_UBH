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
  const role = String(formData.get("role") ?? "student") as UserRole;

  if (!email || !password || !fullName) {
    redirect(`/signup?error=${encodeURIComponent("All fields are required.")}`);
  }
  if (role !== "teacher" && role !== "student") {
    redirect(`/signup?error=${encodeURIComponent("Invalid role.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect("/login?message=Check your email to confirm your account, then log in.");
  }

  redirect(dashboardPathForRole(role));
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
