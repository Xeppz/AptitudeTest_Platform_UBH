-- classes_select checked class_students, and class_students_select checked
-- classes right back — Postgres expands both policies while planning the
-- query and hits infinite recursion before execution even starts. Break the
-- cycle with SECURITY DEFINER helpers (same pattern as get_my_role()): as
-- SECURITY DEFINER functions owned by the table owner, they bypass RLS on
-- the table they query instead of re-triggering its policy.

create or replace function public.is_teacher_of_class(target_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from classes c where c.id = target_class_id and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.is_student_of_class(target_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from class_students cs where cs.class_id = target_class_id and cs.student_id = auth.uid()
  );
$$;

drop policy if exists "classes_select" on classes;
create policy "classes_select"
  on classes for select
  using (
    teacher_id = auth.uid()
    or public.get_my_role() = 'admin'
    or public.is_student_of_class(id)
  );

drop policy if exists "class_students_select" on class_students;
create policy "class_students_select"
  on class_students for select
  using (
    student_id = auth.uid()
    or public.is_teacher_of_class(class_id)
  );
