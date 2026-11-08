-- RiskSense — community reports
--
-- Citizen submissions are stored separately from source events on purpose: they
-- are unverified and must never be joined into the official hazard feed as if
-- they carried the same authority. A report can only ever be *corroborating
-- context*, and only after a moderator moves it off `pending`.
--
-- Coordinates arrive already coarsened to roughly one kilometre by the API
-- route, so this table never holds a precise private location.

create extension if not exists "pgcrypto";

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in (
      'fire-observed',
      'flooding-observed',
      'road-blocked',
      'severe-damage',
      'resource-needed',
      'other'
    )
  ),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  place text,
  country_code text check (country_code is null or char_length(country_code) = 2),
  description text not null check (char_length(description) between 10 and 1200),
  photo_url text,
  status text not null default 'pending' check (
    status in ('pending', 'under-review', 'verified', 'rejected')
  ),
  -- Anonymous handle only. It groups a submitter's reports for abuse handling;
  -- it is never a real identity and is stripped from public API responses.
  reporter_token text not null,
  created_at timestamptz not null default now()
);

create index if not exists community_reports_created_at_idx
  on public.community_reports (created_at desc);

create index if not exists community_reports_status_idx
  on public.community_reports (status);

create index if not exists community_reports_reporter_idx
  on public.community_reports (reporter_token, created_at desc);

alter table public.community_reports enable row level security;

-- Anyone may submit a report, but only as `pending`: the default and the check
-- constraint together stop a client from self-verifying.
drop policy if exists "community_reports_public_insert" on public.community_reports;
create policy "community_reports_public_insert"
  on public.community_reports
  for insert
  to anon, authenticated
  with check (status = 'pending');

-- Anyone may read pending or reviewed reports, but rejected ones stay hidden.
drop policy if exists "community_reports_public_select" on public.community_reports;
create policy "community_reports_public_select"
  on public.community_reports
  for select
  to anon, authenticated
  using (status <> 'rejected');

-- There is deliberately no anon update or delete policy. Moderation uses the
-- service role key from a trusted server context only.
