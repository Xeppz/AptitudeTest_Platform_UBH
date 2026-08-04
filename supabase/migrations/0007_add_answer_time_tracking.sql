alter table answers add column time_spent_seconds integer not null default 0;

-- Called frequently from the client as a student moves between questions
-- (see TestRunner's goToQuestion). Needs to ADD to the existing value, not
-- overwrite it — a plain client-side update() would race against itself
-- across rapid navigation. security invoker (the default) means this runs
-- as the calling student and is still subject to the answers_write_own RLS
-- policy, so it can't be used to write into someone else's session.
create or replace function public.increment_answer_time(
  p_session_id uuid,
  p_question_id uuid,
  p_seconds integer
)
returns void
language sql
as $$
  insert into answers (session_id, question_id, time_spent_seconds)
  values (p_session_id, p_question_id, greatest(p_seconds, 0))
  on conflict (session_id, question_id)
  do update set time_spent_seconds = answers.time_spent_seconds + greatest(p_seconds, 0);
$$;

grant execute on function public.increment_answer_time(uuid, uuid, integer) to authenticated;
