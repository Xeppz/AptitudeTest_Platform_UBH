"use client";

import { useState } from "react";
import { setResultsReleased } from "../actions";

export function ResultsReleaseToggle({ testId, released }: { testId: string; released: boolean }) {
  const [current, setCurrent] = useState(released);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      await setResultsReleased(testId, !current);
      setCurrent((v) => !v);
    } catch {
      // best-effort — the button just stays in its current state on failure
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
        current
          ? "border-slate-300 text-slate-600 hover:bg-slate-50"
          : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
      }`}
    >
      {pending
        ? "Updating…"
        : current
          ? "Results visible to students"
          : "Results hidden from students"}
    </button>
  );
}
