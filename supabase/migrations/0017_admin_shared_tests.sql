-- Every admin account should see and manage every test as one shared
-- workspace, not just the ones they personally created — tests, questions,
-- sessions, answers, proctoring_logs and violations were all scoped to
-- teacher_id = auth.uid() with no admin bypass, so a second admin account
-- couldn't see a test the first admin made at all. get_my_role() is the
-- same SECURITY DEFINER helper already used for this exact bypass on
-- classes_select in 0001_init.sql. Plain 'teacher' role accounts keep the
-- existing owner-only behavior — this only widens access for 'admin'.

drop policy if exists "tests_select" on tests;
create policy "tests_select"
  on tests for select
  using (
    teacher_id = auth.uid()
    or public.get_my_role() = 'admin'
    or (
      status = 'published'
      and (
        target_year is null
        or target_year = (select p.year from profiles p where p.id = auth.uid())
      )
    )
  );

drop policy if exists "tests_update_owner" on tests;
create policy "tests_update_owner"
  on tests for update
  using (teacher_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "tests_delete_owner" on tests;
create policy "tests_delete_owner"
  on tests for delete
  using (teacher_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "questions_all_teacher_owner" on questions;
create policy "questions_all_teacher_owner"
  on questions for all
  using (
    exists (select 1 from tests t where t.id = questions.test_id and t.teacher_id = auth.uid())
    or public.get_my_role() = 'admin'
  )
  with check (
    exists (select 1 from tests t where t.id = questions.test_id and t.teacher_id = auth.uid())
    or public.get_my_role() = 'admin'
  );

drop policy if exists "sessions_select_own_or_teacher" on test_sessions;
create policy "sessions_select_own_or_teacher"
  on test_sessions for select
  using (
    student_id = auth.uid()
    or public.get_my_role() = 'admin'
    or exists (select 1 from tests t where t.id = test_sessions.test_id and t.teacher_id = auth.uid())
  );

drop policy if exists "answers_select_own_or_teacher" on answers;
create policy "answers_select_own_or_teacher"
  on answers for select
  using (
    exists (select 1 from test_sessions s where s.id = answers.session_id and s.student_id = auth.uid())
    or public.get_my_role() = 'admin'
    or exists (
      select 1 from test_sessions s join tests t on t.id = s.test_id
      where s.id = answers.session_id and t.teacher_id = auth.uid()
    )
  );

drop policy if exists "proctoring_logs_select" on proctoring_logs;
create policy "proctoring_logs_select"
  on proctoring_logs for select
  using (
    exists (select 1 from test_sessions s where s.id = proctoring_logs.session_id and s.student_id = auth.uid())
    or public.get_my_role() = 'admin'
    or exists (
      select 1 from test_sessions s join tests t on t.id = s.test_id
      where s.id = proctoring_logs.session_id and t.teacher_id = auth.uid()
    )
  );

drop policy if exists "violations_select" on violations;
create policy "violations_select"
  on violations for select
  using (
    exists (select 1 from test_sessions s where s.id = violations.session_id and s.student_id = auth.uid())
    or public.get_my_role() = 'admin'
    or exists (
      select 1 from test_sessions s join tests t on t.id = s.test_id
      where s.id = violations.session_id and t.teacher_id = auth.uid()
    )
  );
