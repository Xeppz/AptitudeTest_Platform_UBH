import type { Answer, Question, Test } from "@/types/database";

export interface QuestionResult {
  question: Question;
  selectedOption: Answer["selected_option"];
  isAnswered: boolean;
  isCorrect: boolean;
  marksAwarded: number;
  timeSpentSeconds: number;
}

export interface ScoreSummary {
  totalScore: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  perQuestion: QuestionResult[];
}

export function computeScore(
  questions: Question[],
  answers: Answer[],
  test: Pick<Test, "positive_marks" | "negative_marks">,
): ScoreSummary {
  const answerByQuestionId = new Map(answers.map((a) => [a.question_id, a]));

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const perQuestion: QuestionResult[] = questions.map((question) => {
    const answer = answerByQuestionId.get(question.id);
    const selectedOption = answer?.selected_option ?? null;
    const isAnswered = selectedOption !== null;
    const isCorrect = isAnswered && selectedOption === question.correct_option;

    let marksAwarded = 0;
    if (isCorrect) {
      marksAwarded = test.positive_marks;
      correctCount += 1;
    } else if (isAnswered) {
      marksAwarded = -test.negative_marks;
      incorrectCount += 1;
    } else {
      unansweredCount += 1;
    }

    totalScore += marksAwarded;
    maxScore += test.positive_marks;

    return {
      question,
      selectedOption,
      isAnswered,
      isCorrect,
      marksAwarded,
      timeSpentSeconds: answer?.time_spent_seconds ?? 0,
    };
  });

  return { totalScore, maxScore, correctCount, incorrectCount, unansweredCount, perQuestion };
}
