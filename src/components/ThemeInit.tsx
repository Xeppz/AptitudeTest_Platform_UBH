"use client";

import { useLayoutEffect } from "react";
import { getPreferredTheme } from "@/lib/theme";

/**
 * Applies the saved/OS-preferred theme as early as possible: useLayoutEffect
 * runs synchronously after the hydration commit but before the browser
 * paints, so there's no flash on client-side navigations and only a brief
 * one on a hard reload for a dark-mode user (while JS is still loading).
 *
 * A pre-hydration inline <script> (both the raw-tag pattern from Next's own
 * preventing-flash-before-hydration.md doc, and next/script's
 * beforeInteractive strategy) was tried first and both reproducibly threw a
 * real hydration failure in this Next 16 / React 19 / Turbopack combination
 * — confirmed live, not assumed — so this deliberately trades a small
 * amount of flash for zero errors rather than continuing to fight it.
 */
export function ThemeInit() {
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", getPreferredTheme() === "dark");
  }, []);

  return null;
}
