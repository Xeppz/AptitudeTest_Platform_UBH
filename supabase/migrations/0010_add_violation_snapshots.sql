-- Optional snapshot captured from the student's camera at the moment a
-- violation was flagged. Nullable — not every violation captures a frame
-- (e.g. the camera was off, or the capture failed).
alter table proctoring_logs add column if not exists image_path text;

-- Private bucket. No storage.objects policies are added on purpose: every
-- read/write goes through the service-role client (see logViolation in
-- student/tests/[id]/actions.ts and the teacher results page), matching the
-- existing proctoring_logs/violations pattern where students have no direct
-- table access either.
insert into storage.buckets (id, name, public)
values ('violation-snapshots', 'violation-snapshots', false)
on conflict (id) do nothing;
