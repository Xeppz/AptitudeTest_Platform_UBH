"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { STUDENT_YEAR_LABELS, STUDENT_YEARS } from "@/lib/studentYear";

export function YearFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("year") ?? "";

  return (
    <select
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams);
        if (e.target.value) params.set("year", e.target.value);
        else params.delete("year");
        router.push(`/teacher/students?${params.toString()}`);
      }}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      <option value="">All years</option>
      {STUDENT_YEARS.map((y) => (
        <option key={y} value={y}>
          {STUDENT_YEAR_LABELS[y]}
        </option>
      ))}
    </select>
  );
}
