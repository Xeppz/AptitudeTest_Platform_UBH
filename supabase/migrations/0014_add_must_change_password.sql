-- Set on accounts the admin bulk-creates with a temporary password (see the
-- students/import flow); self-signup accounts pick their own password and
-- never need this. Not client-writable — cleared only by trusted server code
-- after a real auth.updateUser() password change actually succeeds (see
-- /change-password's action), not via a column grant a student could flip
-- themselves without changing anything.
alter table profiles add column must_change_password boolean not null default false;

-- must_change_password is read from signUp()/createUser() metadata the same
-- way role/full_name/year already are. Guarded against garbage the same way
-- year is — raw_user_meta_data is client-suppliable, and an invalid cast in
-- this trigger would take the whole signup/account-creation down with it.
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
    new.raw_user_meta_data->>'must_change_password' = 'true'
  );
  return new;
end;
$$;
