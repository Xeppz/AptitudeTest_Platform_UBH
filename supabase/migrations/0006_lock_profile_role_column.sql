-- profiles_update_own (0001_init.sql) lets a user UPDATE their own profile
-- row, but placed no restriction on which columns — a logged-in student
-- could call supabase.from('profiles').update({ role: 'teacher' }) directly
-- from the browser and grant themselves teacher access. RLS policies gate
-- which ROWS are visible/writable; they don't restrict which COLUMNS can be
-- set in an UPDATE. Postgres column-level privileges do exactly that, and
-- apply regardless of RLS, application code, or which page/form is used.
--
-- Only full_name is self-editable now. Promoting someone to teacher/admin
-- must go through trusted server code using the service-role client (which
-- runs as a role that bypasses these grants entirely), e.g.:
--   update public.profiles set role = 'teacher' where email = '...';
-- run directly in the SQL Editor (or via createAdminClient() server-side).
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
