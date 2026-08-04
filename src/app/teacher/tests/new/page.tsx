"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <div className="mx-auto max-w-xl">
        <h1 className="text-xl font-semibold">Create a test</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Paste your questions below in the format shown, and they&apos;ll be parsed
          automatically. You&apos;ll get a chance to review and edit everything before
          publishing.
        </p>

        {error && (
          <pre className="mt-4 whitespace-pre-wrap rounded border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </pre>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="title" className="block text-sm text-neutral-300">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm text-neutral-300">
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="durationMinutes" className="block text-sm text-neutral-300">
                Duration (minutes)
              </label>
              <input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={1}
                required
                defaultValue={30}
                className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label htmlFor="maxViolations" className="block text-sm text-neutral-300">
                Max violations
              </label>
              <input
                id="maxViolations"
                name="maxViolations"
                type="number"
                min={1}
                required
                defaultValue={3}
                className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label htmlFor="positiveMarks" className="block text-sm text-neutral-300">
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
                className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label htmlFor="negativeMarks" className="block text-sm text-neutral-300">
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
                className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pastedText" className="block text-sm text-neutral-300">
              Questions
            </label>
            <textarea
              id="pastedText"
              name="pastedText"
              rows={14}
              required
              placeholder={FORMAT_EXAMPLE}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-neutral-500"
            />
            <details className="mt-2 text-xs text-neutral-500">
              <summary className="cursor-pointer text-neutral-400">Show format example</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded border border-neutral-800 bg-neutral-900 p-3">
                {FORMAT_EXAMPLE}
              </pre>
            </details>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
          >
            {submitting ? "Parsing questions…" : "Parse questions"}
          </button>
        </form>
      </div>
    </div>
  );
}
