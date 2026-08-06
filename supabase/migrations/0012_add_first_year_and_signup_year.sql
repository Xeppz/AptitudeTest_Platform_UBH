-- Adds a third year tier. Kept in its own statement/migration on purpose:
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction as
-- anything that references the new value, so this file does nothing else.
alter type student_year add value if not exists 'first_year' before 'second_year';
