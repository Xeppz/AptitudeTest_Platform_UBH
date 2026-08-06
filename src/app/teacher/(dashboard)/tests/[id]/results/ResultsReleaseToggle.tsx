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
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
