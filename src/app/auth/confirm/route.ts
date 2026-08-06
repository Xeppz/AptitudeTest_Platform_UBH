import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // verifyOtp() establishes a real session for "recovery" — send them to
      // the dedicated reset flow (no current-password check, unlike
      // /change-password — they clicked an emailed link precisely because
      // they don't know their current password) rather than back to a login
      // form they're now already authenticated past.
      redirect(type === "recovery" ? "/reset-password" : "/login?message=Email confirmed. Log in to continue.");
    }
  }

  redirect("/login?error=That confirmation link is invalid or expired.");
}
