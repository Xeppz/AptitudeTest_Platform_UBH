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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Question {index + 1} · {result.question.category}
        </span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">{formatSeconds(result.timeSpentSeconds)}</span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${
              result.isCorrect
                ? "bg-emerald-50 text-emerald-700"
                : result.isAnswered
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {result.isCorrect ? "Correct" : result.isAnswered ? "Incorrect" : "Unanswered"} ·{" "}
            {result.marksAwarded >= 0 ? "+" : ""}
            {result.marksAwarded}
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-900">{result.question.question_text}</p>

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
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : isSelected
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <span className="mr-2 text-slate-400">{letter}</span>
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
