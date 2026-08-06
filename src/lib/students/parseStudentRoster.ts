import { STUDENT_YEAR_LABELS, STUDENT_YEARS } from "@/lib/studentYear";
import type { StudentYear } from "@/types/database";

export interface RosterRow {
  fullName: string;
  email: string;
  year: StudentYear | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function matchYear(raw: string): StudentYear | null {
  const normalized = raw.trim().toLowerCase();
  for (const y of STUDENT_YEARS) {
    if (normalized === y || normalized === STUDENT_YEAR_LABELS[y].toLowerCase()) return y;
  }
  return null;
}

/**
 * One student per line: "Full Name, email@example.com, Year" — year is
 * optional (First/Second/Third Year, case-insensitive, or the raw enum
 * value) and can be left blank if not known yet.
 */
export function parseStudentRoster(text: string): RosterRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Paste at least one student row.");
  }

  const rows: RosterRow[] = [];
  const errors: string[] = [];

  lines.forEach((line, i) => {
    const [fullName, email, yearRaw] = line.split(",").map((p) => p.trim());

    if (!fullName || !email) {
      errors.push(`Line ${i + 1}: expected "Full Name, email" — got "${line}"`);
      return;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push(`Line ${i + 1}: "${email}" doesn't look like a valid email.`);
      return;
    }

    let year: StudentYear | null = null;
    if (yearRaw) {
      year = matchYear(yearRaw);
      if (!year) {
        errors.push(
          `Line ${i + 1}: "${yearRaw}" isn't a recognized year (use First/Second/Third Year, or leave blank).`,
        );
        return;
      }
    }

    rows.push({ fullName, email, year });
  });

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return rows;
}
