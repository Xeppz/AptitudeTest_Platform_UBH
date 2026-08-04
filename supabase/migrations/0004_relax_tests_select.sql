-- Temporary: class management doesn't exist yet, so gating published tests
-- behind class_students membership means no student can ever see a test.
-- Any authenticated student can see any published test for now. Re-tighten
-- this to the class-based check once class assignment is built.
drop policy if exists "tests_select" on tests;
create policy "tests_select"
  on tests for select
  using (
    teacher_id = auth.uid()
    or status = 'published'
  );
