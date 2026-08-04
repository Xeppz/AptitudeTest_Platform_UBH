-- Private bucket for teacher-uploaded question PDFs.
insert into storage.buckets (id, name, public)
values ('question-pdfs', 'question-pdfs', false)
on conflict (id) do nothing;

-- Objects are stored at "<teacher_id>/<uuid>.pdf" — a teacher may only
-- read/write files under their own uid prefix.
create policy "question_pdfs_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'question-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "question_pdfs_select_own"
  on storage.objects for select
  using (
    bucket_id = 'question-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
