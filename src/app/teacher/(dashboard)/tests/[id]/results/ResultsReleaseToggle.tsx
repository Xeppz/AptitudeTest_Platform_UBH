"use client";

import { useState } from "react";
import { setResultsReleased } from "../actions";

export function ResultsReleaseToggle({ testId, released }: { testId: string; released: boolean }) {
  const [current, setCurrent] = useState(released);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      await setResultsReleased(testId, !current);
      setCurrent((v) => !v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={pending}
        className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
          current
            ? "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950"
            : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900"
        }`}
      >
        {pending
          ? "Updating…"
          : current
            ? "Results visible to students"
            : "Results hidden from students"}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
