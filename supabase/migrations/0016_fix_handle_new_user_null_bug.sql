-- 0014's handle_new_user() inserted
--   new.raw_user_meta_data->>'must_change_password' = 'true'
-- directly into a NOT NULL boolean column. When raw_user_meta_data is NULL
-- (accounts created via the Supabase Dashboard's "Add user" have no
-- metadata at all) or simply missing that one key (every self-signup sets
-- full_name/role/year but never this key), that comparison evaluates to SQL
-- NULL rather than false — and inserting NULL into a NOT NULL column
-- aborts the trigger, which aborts the whole auth.users insert. This broke
-- every account-creation path except admin bulk-import, which always sets
-- the field explicitly. Wrapping it in coalesce() fixes all of them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, year, must_change_password)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    case
      when new.raw_user_meta_data->>'year' in ('first_year', 'second_year', 'third_year')
        then (new.raw_user_meta_data->>'year')::student_year
      else null
    end,
    coalesce(new.raw_user_meta_data->>'must_change_password' = 'true', false)
  );
  return new;
end;
$$;
