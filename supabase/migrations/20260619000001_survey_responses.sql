create table if not exists public.survey_responses (
  id          uuid        default gen_random_uuid() primary key,
  q1_location text,
  q2_residence text,
  q3_worries  text[],
  q4_check_method text,
  q5_value_perception text,
  name        text        not null,
  whatsapp    text        not null,
  email       text        not null,
  parent_city text        not null,
  source      text,
  created_at  timestamptz default now() not null
);

alter table public.survey_responses enable row level security;

-- Only admins can read survey responses
create policy "admins_read_survey_responses"
  on public.survey_responses for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
