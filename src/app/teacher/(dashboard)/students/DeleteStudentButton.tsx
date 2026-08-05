"use client";

import { useTransition } from "react";
import { deleteStudent } from "./actions";

export function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      `Delete ${studentName}'s account? This permanently removes their profile, test sessions, and answers. This cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteStudent(studentId);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete student.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
