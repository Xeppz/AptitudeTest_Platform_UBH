"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STUDENT_YEAR_LABELS, STUDENT_YEARS } from "@/lib/studentYear";

const FORMAT_EXAMPLE = `Q: What is 15% of 200?
A) 20
B) 30
C) 40
D) 50
Answer: B
Category: Quantitative

Q: If all cats are animals and all animals need food, do all cats need food?
A) Yes
B) No
C) Cannot be determined
D) Only some cats
Answer: A
Category: Logical`;

export default function NewTestPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);

    // datetime-local inputs give a plain "YYYY-MM-DDTHH:mm" string with no
    // timezone info. It has to be converted to an absolute ISO timestamp
    // here, in the browser — the server runs in a different timezone
    // (Vercel's function region), so parsing the same raw string there
    // would silently shift it.
    for (const key of ["startsAt", "endsAt"]) {
      const raw = formData.get(key);
      if (typeof raw === "string" && raw) {
        formData.set(key, new Date(raw).toISOString());
      } else {
        formData.delete(key);
      }
    }

    try {
      const res = await fetch("/api/tests", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to create test.");
      }
      router.push(`/teacher/tests/${body.testId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="text-2xl font-semibold text-slate-900">Create a test</p>
      <p className="mt-1 text-sm text-slate-500">
        Paste your questions below in the format shown, and they&apos;ll be parsed automatically.
        You&apos;ll get a chance to review and edit everything before publishing.
      </p>

      {error && (
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </pre>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="block text-sm text-slate-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm text-slate-700">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="targetYear" className="block text-sm text-slate-700">
            Publish for
          </label>
          <select
            id="targetYear"
            name="targetYear"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All years</option>
            {STUDENT_YEARS.map((y) => (
              <option key={y} value={y}>
                {STUDENT_YEAR_LABELS[y]} only
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startsAt" className="block text-sm text-slate-700">
              Opens at (optional)
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endsAt" className="block text-sm text-slate-700">
              Closes at (optional)
            </label>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <p className="-mt-2 text-xs text-slate-500">
          Leave both blank for a test that&apos;s available any time once published.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="durationMinutes" className="block text-sm text-slate-700">
              Duration (minutes)
            </label>
            <input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min={1}
              required
              defaultValue={30}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="maxViolations" className="block text-sm text-slate-700">
              Max violations
            </label>
            <input
              id="maxViolations"
              name="maxViolations"
              type="number"
              min={1}
              required
              defaultValue={3}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="positiveMarks" className="block text-sm text-slate-700">
              Positive marks
            </label>
            <input
              id="positiveMarks"
              name="positiveMarks"
              type="number"
              step="0.5"
              min={0}
              required
              defaultValue={1}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="negativeMarks" className="block text-sm text-slate-700">
              Negative marks
            </label>
            <input
              id="negativeMarks"
              name="negativeMarks"
              type="number"
              step="0.5"
              min={0}
              required
              defaultValue={0}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pastedText" className="block text-sm text-slate-700">
            Questions
          </label>
          <textarea
            id="pastedText"
            name="pastedText"
            rows={14}
            required
            placeholder={FORMAT_EXAMPLE}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <details className="mt-2 text-xs text-slate-500">
            <summary className="cursor-pointer text-slate-600">Show format example</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3">
              {FORMAT_EXAMPLE}
            </pre>
          </details>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Parsing questions…" : "Parse questions"}
        </button>
      </form>
    </div>
  );
}
