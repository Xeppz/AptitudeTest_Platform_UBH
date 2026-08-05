"use client";

import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";

/**
 * Wraps the sign-out server action so the browser is told the session ended
 * intentionally. Without this, Chrome's saved-password "Auto Sign-in" will
 * silently re-fill and re-submit the login form on the next visit — no
 * prompt, no click. preventSilentAccess() only affects the *next* silent
 * credential fetch, so it has to run at sign-out time, not on the login page.
 */
export function SignOutForm({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <form
      action={signOut}
      onSubmit={() => {
        navigator.credentials?.preventSilentAccess?.().catch(() => {});
      }}
    >
      <button type="submit" aria-label={ariaLabel} className={className}>
        {children}
      </button>
    </form>
  );
}
