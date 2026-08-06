-- Run this only after 0012 has been applied (a new enum value can't be
-- referenced in the same transaction it was added in).
--
-- Students now pick their year on the signup form itself, passed through as
-- auth signUp() metadata alongside full_name/role — handle_new_user() needs
-- to read it too, or it's silently dropped on the floor.
-- The year value is validated against a known-good allowlist rather than
-- cast directly — an unrecognized string cast to student_year raises a hard
-- error, which would abort the trigger and take the entire signup down
-- with it. raw_user_meta_data is client-suppliable (anyone can call
-- auth.signUp() directly with arbitrary metadata), so this can't assume the
-- app's own <select> is the only thing that will ever populate it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, year)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    case
      when new.raw_user_meta_data->>'year' in ('first_year', 'second_year', 'third_year')
        then (new.raw_user_meta_data->>'year')::student_year
      else null
    end
  );
  return new;
end;
$$;
