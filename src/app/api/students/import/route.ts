import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStudentRoster } from "@/lib/students/parseStudentRoster";
import { STUDENT_YEAR_LABELS } from "@/lib/studentYear";
import type { Profile } from "@/types/database";

function generateTempPassword() {
  // base64url avoids characters (/, +, =) that are easy to misread when
  // copied off screen or read aloud.
  return randomBytes(9).toString("base64url");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (data as Pick<Profile, "role"> | null)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rosterText } = await request.json();

  let rows;
  try {
    rows = parseStudentRoster(String(rosterText ?? ""));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse the roster." },
      { status: 422 },
    );
  }

  const admin = createAdminClient();
  const results = [];

  for (const row of rows) {
    const tempPassword = generateTempPassword();
    const { error } = await admin.auth.admin.createUser({
      email: row.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: row.fullName,
        role: "student",
        year: row.year ?? "",
        must_change_password: "true",
      },
    });

    results.push({
      fullName: row.fullName,
      email: row.email,
      year: row.year ? STUDENT_YEAR_LABELS[row.year] : "",
      tempPassword: error ? null : tempPassword,
      error: error?.message ?? null,
    });
  }

  return NextResponse.json({ results });
}
