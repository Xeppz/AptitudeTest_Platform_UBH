-- ── Enums ───────────────────────────────────────────────────
create type user_role as enum ('admin', 'teacher', 'student');
create type test_status as enum ('draft', 'published', 'archived');
create type session_status as enum ('not_started', 'in_progress', 'submitted', 'auto_submitted');
create type violation_type as enum (
  'tab_switch', 'window_blur', 'fullscreen_exit',
  'camera_off', 'mic_off', 'face_not_detected', 'multiple_faces'
);

-- ── Identity ────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table class_students (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  primary key (class_id, student_id)
);

-- ── Tests & Questions ───────────────────────────────────────
create table tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  teacher_id uuid not null references profiles(id),
  class_id uuid references classes(id),
  duration_minutes int not null,
  positive_marks numeric not null default 1,
  negative_marks numeric not null default 0,
  max_violations int not null default 3,
  status test_status not null default 'draft',
  source_pdf_path text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  category text not null,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A', 'B', 'C', 'D')),
  order_index int not null,
  marks numeric not null default 1
);

-- ── Sessions & Answers ──────────────────────────────────────
create table test_sessions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id),
  student_id uuid not null references profiles(id),
  status session_status not null default 'not_started',
  camera_verified boolean not null default false,
  mic_verified boolean not null default false,
  started_at timestamptz,
  submitted_at timestamptz,
  violation_count int not null default 0,
  unique (test_id, student_id)
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  question_id uuid not null references questions(id),
  selected_option char(1) check (selected_option in ('A', 'B', 'C', 'D')),
  marked_for_review boolean not null default false,
  answered_at timestamptz default now(),
  unique (session_id, question_id)
);

-- ── Proctoring ──────────────────────────────────────────────
create table proctoring_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  event_type violation_type not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create table violations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  violation_type violation_type not null,
  flag_count_at_time int not null,
  created_at timestamptz not null default now()
);

-- ── Auto-create profile row on signup ──────────────────────
-- Role/full_name are supplied via supabase.auth.signUp({ options: { data: { role, full_name } } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ──────────────────────────────────────
-- Helper avoids infinite recursion when a profiles policy needs to check the caller's own role.
create or replace function public.get_my_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table profiles enable row level security;
alter table classes enable row level security;
alter table class_students enable row level security;
alter table tests enable row level security;
alter table questions enable row level security;
alter table test_sessions enable row level security;
alter table answers enable row level security;
alter table proctoring_logs enable row level security;
alter table violations enable row level security;

-- profiles
create policy "profiles_select_own_or_staff"
  on profiles for select
  using (auth.uid() = id or public.get_my_role() in ('teacher', 'admin'));

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

-- classes
create policy "classes_select"
  on classes for select
  using (
    teacher_id = auth.uid()
    or public.get_my_role() = 'admin'
    or exists (select 1 from class_students cs where cs.class_id = classes.id and cs.student_id = auth.uid())
  );

create policy "classes_insert_teacher"
  on classes for insert
  with check (teacher_id = auth.uid() and public.get_my_role() in ('teacher', 'admin'));

create policy "classes_update_owner"
  on classes for update
  using (teacher_id = auth.uid());

-- class_students
create policy "class_students_select"
  on class_students for select
  using (
    student_id = auth.uid()
    or exists (select 1 from classes c where c.id = class_students.class_id and c.teacher_id = auth.uid())
  );

create policy "class_students_insert_teacher"
  on class_students for insert
  with check (exists (select 1 from classes c where c.id = class_students.class_id and c.teacher_id = auth.uid()));

-- tests (students only see published tests in a class they belong to; teachers see their own)
create policy "tests_select"
  on tests for select
  using (
    teacher_id = auth.uid()
    or (
      status = 'published'
      and exists (select 1 from class_students cs where cs.class_id = tests.class_id and cs.student_id = auth.uid())
    )
  );

create policy "tests_insert_teacher"
  on tests for insert
  with check (teacher_id = auth.uid() and public.get_my_role() in ('teacher', 'admin'));

create policy "tests_update_owner"
  on tests for update
  using (teacher_id = auth.uid());

create policy "tests_delete_owner"
  on tests for delete
  using (teacher_id = auth.uid());

-- questions: teacher-owner only. Students never query this table directly —
-- they receive sanitized (answer-stripped) questions from a server API route
-- using the service-role key, so a student can't read correct_option via RLS.
create policy "questions_all_teacher_owner"
  on questions for all
  using (exists (select 1 from tests t where t.id = questions.test_id and t.teacher_id = auth.uid()))
  with check (exists (select 1 from tests t where t.id = questions.test_id and t.teacher_id = auth.uid()));

-- test_sessions
create policy "sessions_select_own_or_teacher"
  on test_sessions for select
  using (
    student_id = auth.uid()
    or exists (select 1 from tests t where t.id = test_sessions.test_id and t.teacher_id = auth.uid())
  );

create policy "sessions_insert_own"
  on test_sessions for insert
  with check (student_id = auth.uid());

create policy "sessions_update_own"
  on test_sessions for update
  using (student_id = auth.uid());

-- answers
create policy "answers_select_own_or_teacher"
  on answers for select
  using (
    exists (select 1 from test_sessions s where s.id = answers.session_id and s.student_id = auth.uid())
    or exists (
      select 1 from test_sessions s join tests t on t.id = s.test_id
      where s.id = answers.session_id and t.teacher_id = auth.uid()
    )
  );

create policy "answers_write_own"
  on answers for all
  using (exists (select 1 from test_sessions s where s.id = answers.session_id and s.student_id = auth.uid()))
  with check (exists (select 1 from test_sessions s where s.id = answers.session_id and s.student_id = auth.uid()));

-- proctoring_logs: select only for authenticated clients. All inserts happen
-- server-side (service-role key in /api/proctoring/log) so a student can't
-- tamper with or erase their own violation trail via the browser client.
create policy "proctoring_logs_select"
  on proctoring_logs for select
  using (
    exists (select 1 from test_sessions s where s.id = proctoring_logs.session_id and s.student_id = auth.uid())
    or exists (
      select 1 from test_sessions s join tests t on t.id = s.test_id
      where s.id = proctoring_logs.session_id and t.teacher_id = auth.uid()
    )
  );

-- violations: same reasoning — select only, writes are server-side only.
create policy "violations_select"
  on violations for select
  using (
    exists (select 1 from test_sessions s where s.id = violations.session_id and s.student_id = auth.uid())
    or exists (
      select 1 from test_sessions s join tests t on t.id = s.test_id
      where s.id = violations.session_id and t.teacher_id = auth.uid()
    )
  );
