import type { OptionLetter, Question } from "@/types/database";
import type { QuestionResult } from "@/lib/scoring";

const OPTION_LETTERS: OptionLetter[] = ["A", "B", "C", "D"];

export function formatSeconds(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}

export function QuestionReviewCard({
  result,
  index,
  selectedLabel = "your answer",
}: {
  result: QuestionResult;
  index: number;
  selectedLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Question {index + 1} · {result.question.category}
        </span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-slate-500">{formatSeconds(result.timeSpentSeconds)}</span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              result.isCorrect
                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                : result.isAnswered
                  ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}
          >
            {result.isCorrect ? "Correct" : result.isAnswered ? "Incorrect" : "Unanswered"} ·{" "}
            {result.marksAwarded >= 0 ? "+" : ""}
            {result.marksAwarded}
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{result.question.question_text}</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OPTION_LETTERS.map((letter) => {
          const key = `option_${letter.toLowerCase()}` as keyof Question;
          const isCorrectOption = letter === result.question.correct_option;
          const isSelected = letter === result.selectedOption;
          return (
            <div
              key={letter}
              className={`rounded-md border px-3 py-2 text-sm ${
                isCorrectOption
                  ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                  : isSelected
                    ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="mr-2 text-slate-400 dark:text-slate-500">{letter}</span>
              {result.question[key] as string}
              {isCorrectOption && <span className="ml-2 text-xs">(correct)</span>}
              {isSelected && !isCorrectOption && <span className="ml-2 text-xs">({selectedLabel})</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
