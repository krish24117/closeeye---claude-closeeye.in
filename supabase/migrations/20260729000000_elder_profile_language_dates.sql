-- Family Intelligence + Memory (CloseEye Connect, Pillars 1 & 6): capture the elder's
-- preferred language and the important dates the family cherishes (birthdays,
-- anniversaries, festivals). Both feed the AI's family brief so Connect knows the
-- person, not just their conditions. Additive + idempotent.
--
-- (An older `special_dates jsonb` column existed but was never wired to any UI;
--  `important_dates` is the simple free-text field the health form actually captures.)
alter table public.elder_profiles add column if not exists language        text;
alter table public.elder_profiles add column if not exists important_dates text;
