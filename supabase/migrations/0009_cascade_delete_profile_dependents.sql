-- Deleting a student profile (via supabase.auth.admin.deleteUser(), which
-- cascades auth.users -> profiles per 0001_init.sql) currently fails with a
-- foreign key violation if that student has any test_sessions or
-- class_students rows, because those FKs were created with no ON DELETE
-- action (default RESTRICT). answers/proctoring_logs/violations already
-- cascade from test_sessions, so fixing these two is enough for a full
-- cascade delete of a student and everything they created.
--
-- Constraint names aren't hardcoded since Postgres's auto-generated names
-- for unnamed FKs, while conventional, aren't guaranteed — this looks them
-- up by (table, referenced table) instead.

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'test_sessions'::regclass
      and confrelid = 'profiles'::regclass
      and contype = 'f'
  loop
    execute format('alter table test_sessions drop constraint %I', con.conname);
  end loop;
end $$;

alter table test_sessions
  add constraint test_sessions_student_id_fkey
  foreign key (student_id) references profiles(id) on delete cascade;

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'class_students'::regclass
      and confrelid = 'profiles'::regclass
      and contype = 'f'
  loop
    execute format('alter table class_students drop constraint %I', con.conname);
  end loop;
end $$;

alter table class_students
  add constraint class_students_student_id_fkey
  foreign key (student_id) references profiles(id) on delete cascade;
