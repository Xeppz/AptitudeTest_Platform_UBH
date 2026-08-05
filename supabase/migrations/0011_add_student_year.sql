-- Students self-report which year they're in; teachers/admins can view and
-- filter by it, and scope a test's visibility to one year. Admins never edit
-- a student's value through the app — enforced below, not just by omission
-- in the UI (see the reasoning in 0006_lock_profile_role_column.sql).
create type student_year as enum ('second_year', 'third_year');

alter table profiles add column year student_year;

-- profiles.year needs the same self-update carve-out as full_name — the
-- blanket revoke in 0006_lock_profile_role_column.sql otherwise blocks
-- students from setting their own year at all.
grant update (year) on public.profiles to authenticated;

-- Tests can optionally be scoped to one year. Null = visible to every
-- student regardless of year, so existing published tests keep working
-- unchanged.
alter table tests add column target_year student_year;

drop policy if exists "tests_select" on tests;
create policy "tests_select"
  on tests for select
  using (
    teacher_id = auth.uid()
    or (
      status = 'published'
      and (
        target_year is null
        or target_year = (select p.year from profiles p where p.id = auth.uid())
      )
    )
  );
