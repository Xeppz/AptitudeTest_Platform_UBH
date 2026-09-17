"use client";

import { useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getPreferredTheme } from "@/lib/theme";

export function ThemeToggle({ className, showLabel }: { className?: string; showLabel?: boolean }) {
  // Always starts false (Moon) so the very first client render matches the
  // server-rendered output exactly — getPreferredTheme() can only be known
  // client-side, and computing it in a lazy initializer (rather than after
  // mount) caused a real hydration-failure crash here, confirmed live: the
  // icon's children (Sun vs Moon) differed between server and the client's
  // own first hydration render.
  const [isDark, setIsDark] = useState(false);

  useLayoutEffect(() => {
    // Corrects the icon immediately after the hydration commit, before the
    // browser paints — no visible flash, and this runs strictly after
    // hydration has already succeeded on the matching false/Moon state, so
    // it can't cause the mismatch the lazy-initializer version did.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above: this is the fix for a confirmed hydration crash, not an avoidable one.
    setIsDark(getPreferredTheme() === "dark");
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={
        className ??
        "flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      }
    >
      <Icon size={18} className={showLabel ? "shrink-0" : undefined} />
      {showLabel && <span>{isDark ? "Light theme" : "Dark theme"}</span>}
    </button>
  );
}
