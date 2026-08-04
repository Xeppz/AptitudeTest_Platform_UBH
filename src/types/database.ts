export type UserRole = "admin" | "teacher" | "student";
export type TestStatus = "draft" | "published" | "archived";
export type SessionStatus = "not_started" | "in_progress" | "submitted" | "auto_submitted";
export type OptionLetter = "A" | "B" | "C" | "D";
export type ViolationType =
  | "tab_switch"
  | "window_blur"
  | "fullscreen_exit"
  | "camera_off"
  | "mic_off"
  | "face_not_detected"
  | "multiple_faces";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  created_at: string;
}

export interface ClassRow {
  id: string;
  name: string;
  teacher_id: string;
  created_at: string;
}

export interface Test {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string;
  class_id: string | null;
  duration_minutes: number;
  positive_marks: number;
  negative_marks: number;
  max_violations: number;
  status: TestStatus;
  source_pdf_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  test_id: string;
  category: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionLetter;
  order_index: number;
  marks: number;
}

/** Question shape returned to students — never includes correct_option. */
export type QuestionForStudent = Omit<Question, "correct_option">;

export interface TestSession {
  id: string;
  test_id: string;
  student_id: string;
  status: SessionStatus;
  camera_verified: boolean;
  mic_verified: boolean;
  started_at: string | null;
  submitted_at: string | null;
  violation_count: number;
}

export interface Answer {
  id: string;
  session_id: string;
  question_id: string;
  selected_option: OptionLetter | null;
  marked_for_review: boolean;
  answered_at: string;
}

export interface ProctoringLog {
  id: string;
  session_id: string;
  event_type: ViolationType;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Violation {
  id: string;
  session_id: string;
  violation_type: ViolationType;
  flag_count_at_time: number;
  created_at: string;
}

type TableDef<Row, Insert, Update = Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update };

/**
 * Hand-authored schema shape matching supabase-js's generic Database contract,
 * so `.from(...)` calls are typed correctly. Swap for `supabase gen types
 * typescript` output once the project is linked via the Supabase CLI —
 * this unblocks development before that CLI step happens.
 */
export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        { id: string; role?: UserRole; full_name: string; email: string; created_at?: string }
      >;
      classes: TableDef<
        ClassRow,
        { id?: string; name: string; teacher_id: string; created_at?: string }
      >;
      class_students: TableDef<
        { class_id: string; student_id: string },
        { class_id: string; student_id: string }
      >;
      tests: TableDef<
        Test,
        {
          id?: string;
          title: string;
          description?: string | null;
          teacher_id: string;
          class_id?: string | null;
          duration_minutes: number;
          positive_marks?: number;
          negative_marks?: number;
          max_violations?: number;
          status?: TestStatus;
          source_pdf_path?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
        }
      >;
      questions: TableDef<
        Question,
        {
          id?: string;
          test_id: string;
          category: string;
          question_text: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: OptionLetter;
          order_index: number;
          marks?: number;
        }
      >;
      test_sessions: TableDef<
        TestSession,
        {
          id?: string;
          test_id: string;
          student_id: string;
          status?: SessionStatus;
          camera_verified?: boolean;
          mic_verified?: boolean;
          started_at?: string | null;
          submitted_at?: string | null;
          violation_count?: number;
        }
      >;
      answers: TableDef<
        Answer,
        {
          id?: string;
          session_id: string;
          question_id: string;
          selected_option?: OptionLetter | null;
          marked_for_review?: boolean;
          answered_at?: string;
        }
      >;
      proctoring_logs: TableDef<
        ProctoringLog,
        {
          id?: string;
          session_id: string;
          event_type: ViolationType;
          event_data?: Record<string, unknown> | null;
          created_at?: string;
        }
      >;
      violations: TableDef<
        Violation,
        {
          id?: string;
          session_id: string;
          violation_type: ViolationType;
          flag_count_at_time: number;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      test_status: TestStatus;
      session_status: SessionStatus;
      violation_type: ViolationType;
    };
    CompositeTypes: Record<string, never>;
  };
};
