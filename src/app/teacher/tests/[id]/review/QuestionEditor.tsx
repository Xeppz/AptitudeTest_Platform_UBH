"use client";

import { useState } from "react";
import { deleteQuestion, updateQuestion, type QuestionEdit } from "../actions";
import type { OptionLetter, Question } from "@/types/database";

const OPTION_LETTERS: OptionLetter[] = ["A", "B", "C", "D"];

export function QuestionEditor({
  testId,
  question,
  index,
}: {
  testId: string;
  question: Question;
  index: number;
}) {
  const [edit, setEdit] = useState<QuestionEdit>({
    category: question.category,
    question_text: question.question_text,
    option_a: question.option_a,
    option_b: question.option_b,
    option_c: question.option_c,
    option_d: question.option_d,
    correct_option: question.correct_option,
  });
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof QuestionEdit>(key: K, value: QuestionEdit[K]) {
    setEdit((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateQuestion(testId, question.id, edit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await deleteQuestion(testId, question.id);
      setDeleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
      setSaving(false);
    }
  }

  if (deleted) return null;

  return (
    <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">Question {index + 1}</span>
        <input
          value={edit.category}
          onChange={(e) => field("category", e.target.value)}
          className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
        />
      </div>

      <textarea
        value={edit.question_text}
        onChange={(e) => field("question_text", e.target.value)}
        rows={2}
        className="mt-2 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
      />

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OPTION_LETTERS.map((letter) => {
          const key = `option_${letter.toLowerCase()}` as keyof QuestionEdit;
          return (
            <label key={letter} className="flex items-center gap-2 text-sm text-neutral-200">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={edit.correct_option === letter}
                onChange={() => field("correct_option", letter)}
              />
              <span className="w-4 text-neutral-500">{letter}</span>
              <input
                value={edit[key]}
                onChange={(e) => field(key, e.target.value)}
                className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100"
              />
            </label>
          );
        })}
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={handleDelete}
          disabled={saving}
          className="rounded border border-red-800 px-3 py-1 text-xs text-red-300 hover:bg-red-950 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
