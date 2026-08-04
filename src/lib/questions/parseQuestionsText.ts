import type { OptionLetter } from "@/types/database";

export interface ParsedQuestion {
  category: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionLetter;
}

const QUESTION_START = /^Q\s*[:.]\s*(.*)$/i;
const OPTION_LINE = /^([A-D])[).:]\s*(.+)$/i;
const ANSWER_LINE = /^ANSWER\s*[:.]\s*([A-D])\b/i;
const CATEGORY_LINE = /^CATEGORY\s*[:.]\s*(.+)$/i;

const OPTION_LETTERS: OptionLetter[] = ["A", "B", "C", "D"];

/**
 * Parses the fixed "Q: / A) / B) / C) / D) / Answer: / Category:" text format —
 * no LLM involved, so this only works for text already in (or reformatted into)
 * that shape.
 */
export function parseQuestionsText(raw: string): ParsedQuestion[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  const blocks: { startLine: number; lines: string[] }[] = [];
  let current: { startLine: number; lines: string[] } | null = null;

  lines.forEach((line, index) => {
    const qMatch = line.match(QUESTION_START);
    if (qMatch) {
      current = { startLine: index + 1, lines: [qMatch[1]] };
      blocks.push(current);
      return;
    }
    current?.lines.push(line);
  });

  if (blocks.length === 0) {
    throw new Error('No questions found. Each question must start with a line beginning "Q:".');
  }

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  for (const block of blocks) {
    const questionLines: string[] = [];
    const options: Partial<Record<OptionLetter, string>> = {};
    let correctOption: OptionLetter | null = null;
    let category = "General";

    for (const raw of block.lines) {
      const line = raw.trim();
      if (!line) continue;

      const answerMatch = line.match(ANSWER_LINE);
      const categoryMatch = line.match(CATEGORY_LINE);
      const optionMatch = line.match(OPTION_LINE);

      if (answerMatch) {
        correctOption = answerMatch[1].toUpperCase() as OptionLetter;
      } else if (categoryMatch) {
        category = categoryMatch[1].trim();
      } else if (optionMatch) {
        const letter = optionMatch[1].toUpperCase() as OptionLetter;
        options[letter] = optionMatch[2].trim();
      } else if (Object.keys(options).length === 0) {
        // Still before any option line — treat as continuation of the question text.
        questionLines.push(line);
      }
    }

    const questionText = questionLines.join(" ").trim();
    const preview = questionText ? `"${questionText.slice(0, 50)}"` : "(no text found)";
    const missing = OPTION_LETTERS.filter((letter) => !options[letter]);

    if (!questionText) {
      errors.push(`Line ${block.startLine}: question has no text.`);
      continue;
    }
    if (missing.length > 0) {
      errors.push(`Line ${block.startLine} ${preview}: missing option(s) ${missing.join(", ")}.`);
      continue;
    }
    if (!correctOption) {
      errors.push(`Line ${block.startLine} ${preview}: missing or invalid "Answer:" line.`);
      continue;
    }

    questions.push({
      category,
      question_text: questionText,
      option_a: options.A!,
      option_b: options.B!,
      option_c: options.C!,
      option_d: options.D!,
      correct_option: correctOption,
    });
  }

  if (errors.length > 0) {
    throw new Error(`Found ${errors.length} problem(s):\n${errors.join("\n")}`);
  }

  return questions;
}
