"use client";

import { useState } from "react";

interface ImportResult {
  fullName: string;
  email: string;
  year: string;
  tempPassword: string | null;
  error: string | null;
}

const PLACEHOLDER = `Priya Sharma, priya.sharma@example.com, First Year
Rahul Verma, rahul.verma@example.com, Second Year
Ananya Iyer, ananya.iyer@example.com`;

export function ImportForm() {
  const [rosterText, setRosterText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    setResults(null);

    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterText }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to import students.");
      setResults(body.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyResults() {
    if (!results) return;
    const lines = results.map((r) =>
      r.tempPassword
        ? `${r.fullName}\t${r.email}\t${r.year}\t${r.tempPassword}`
        : `${r.fullName}\t${r.email}\tFAILED: ${r.error}`,
    );
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-6">
      {!results && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={rosterText}
            onChange={(e) => setRosterText(e.target.value)}
            rows={10}
            required
            placeholder={PLACEHOLDER}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {error && (
            <pre className="whitespace-pre-wrap rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </pre>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Creating accounts…" : "Import students"}
          </button>
        </form>
      )}

      {results && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {results.filter((r) => r.tempPassword).length}/{results.length} accounts created.
            </p>
            <button
              onClick={copyResults}
              className="rounded-md border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              {copied ? "Copied" : "Copy all"}
            </button>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Year</th>
                  <th className="px-4 py-2 font-medium">Temporary Password</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.email} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{r.fullName}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.email}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.year || "—"}</td>
                    <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
                      {r.tempPassword ?? <span className="text-red-600 dark:text-red-400">{r.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => {
              setResults(null);
              setRosterText("");
            }}
            className="mt-4 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950"
          >
            Import more
          </button>
        </div>
      )}
    </div>
  );
}
