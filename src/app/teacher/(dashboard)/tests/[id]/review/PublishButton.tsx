"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishTest } from "../actions";

export function PublishButton({ testId }: { testId: string }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      await publishTest(testId);
      router.push("/teacher");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
      setPublishing(false);
    }
  }

  return (
    <div>
      <button
        onClick={handlePublish}
        disabled={publishing}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {publishing ? "Publishing…" : "Publish test"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
