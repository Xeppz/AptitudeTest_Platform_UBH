"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Enter your email.")}`);
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  // Supabase appends its own token_hash/type params to this URL when it
  // redirects the user after they click the email link — don't add them here.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
  });

  // Never reveal whether the email exists — same anti-enumeration reasoning
  // as the signup flow, just in the other direction: an error here would
  // leak account existence to anyone who tries an address.
  if (error) {
    // Logged server-side only; the user still sees the generic message below.
    console.error("resetPasswordForEmail failed:", error.message);
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "If an account exists for that email, a password reset link has been sent.",
    )}`,
  );
}
