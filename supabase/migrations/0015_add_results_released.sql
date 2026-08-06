-- Defaults to true so existing behavior (students see their score the
-- moment they submit) doesn't silently change for every test already
-- published — a teacher opts INTO hiding results, rather than every test
-- needing an explicit release going forward.
alter table tests add column results_released boolean not null default true;
