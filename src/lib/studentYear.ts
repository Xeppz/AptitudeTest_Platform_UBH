import type { StudentYear } from "@/types/database";

export const STUDENT_YEAR_LABELS: Record<StudentYear, string> = {
  second_year: "Second Year",
  third_year: "Third Year",
};

export const STUDENT_YEARS: StudentYear[] = ["second_year", "third_year"];
