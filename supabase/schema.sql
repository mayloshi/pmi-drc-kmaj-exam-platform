-- PMI RDC / K-Majuscule Exam Platform
-- Supabase schema for the GitHub Pages static app.
-- Initial database: empty tables, no seed data.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  organization text default '',
  cohort text default '',
  role text not null default 'Candidat',
  category text not null default 'formation' check (category in ('formation', 'volontaire', 'membre', 'partenaire')),
  voucher_code text default '',
  default_language text not null default 'fr' check (default_language in ('fr', 'en')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vouchers (
  code text primary key,
  role text not null,
  category text not null default 'formation' check (category in ('formation', 'volontaire', 'membre', 'partenaire')),
  validity_months integer not null default 4,
  access_percent integer not null default 100,
  status text not null default 'available' check (status in ('available', 'assigned', 'used')),
  assigned_to text default '',
  used_by text default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_at timestamptz
);

alter table public.profiles add column if not exists category text not null default 'formation';
alter table public.vouchers add column if not exists category text not null default 'formation';
alter table public.vouchers add column if not exists validity_months integer not null default 4;
alter table public.vouchers add column if not exists access_percent integer not null default 100;
alter table public.vouchers add column if not exists expires_at timestamptz;

create table if not exists public.voucher_settings (
  category text primary key check (category in ('formation', 'volontaire', 'membre', 'partenaire')),
  label_fr text not null,
  label_en text not null,
  validity_months integer not null,
  access_percent integer not null,
  prefix text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_lots (
  id text primary key,
  exam_type text not null check (exam_type in ('CAPM', 'PMP', 'Gestion de projet')),
  title_fr text not null,
  title_en text not null,
  source text default '',
  question_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.question_bank (
  id text primary key,
  lot_id text not null references public.exam_lots(id) on delete cascade,
  exam_type text not null check (exam_type in ('CAPM', 'PMP', 'Gestion de projet')),
  question_type text not null check (question_type in ('single', 'multiple')),
  prompt_fr text not null,
  prompt_en text not null,
  options_fr jsonb not null default '[]'::jsonb,
  options_en jsonb not null default '[]'::jsonb,
  correct_indexes jsonb not null default '[]'::jsonb,
  explanation_fr text default '',
  explanation_en text default '',
  eco_fr text default '',
  eco_en text default '',
  performance_domain_fr text default '',
  performance_domain_en text default '',
  approach_fr text default '',
  approach_en text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key,
  candidate_name text not null,
  email text default '',
  organization text default '',
  cohort text default '',
  has_account boolean not null default false,
  exam_type text not null check (exam_type in ('CAPM', 'PMP', 'Gestion de projet')),
  lot_id text not null,
  lot_title text not null,
  started_at timestamptz not null,
  submitted_at timestamptz,
  status text not null check (status in ('saved', 'submitted', 'cancelled')),
  score integer not null default 0,
  total integer not null default 0,
  percent integer not null default 0,
  remaining_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id text not null,
  answer_indexes jsonb not null default '[]'::jsonb,
  is_correct boolean not null default false,
  highlighted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.attempt_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  identifier_type text not null check (identifier_type in ('email', 'name', 'account')),
  max_attempts integer not null default 2,
  active boolean not null default true,
  note text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.attempts(id) on delete set null,
  to_email text not null,
  subject text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists vouchers_assigned_to_idx on public.vouchers (lower(assigned_to));
create index if not exists vouchers_category_status_idx on public.vouchers (category, status);
create index if not exists attempts_email_idx on public.attempts (lower(email));
create index if not exists attempts_cohort_idx on public.attempts (cohort);
create index if not exists attempt_answers_attempt_id_idx on public.attempt_answers (attempt_id);
create index if not exists attempt_limits_identifier_idx on public.attempt_limits (identifier_type, lower(identifier));
create index if not exists email_queue_status_idx on public.email_queue (status, created_at);

insert into public.voucher_settings (category, label_fr, label_en, validity_months, access_percent, prefix)
values
  ('formation', 'Participant formation', 'Training participant', 4, 100, 'FORMATION'),
  ('volontaire', 'Volontaire', 'Volunteer', 3, 60, 'VOLONTAIRE'),
  ('membre', 'Membre', 'Member', 12, 60, 'MEMBRE'),
  ('partenaire', 'Partenaire', 'Partner', 3, 50, 'PARTENAIRE')
on conflict (category) do nothing;

create or replace function public.handle_new_exam_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  voucher text;
begin
  voucher := coalesce(new.raw_user_meta_data ->> 'voucher_code', '');

  insert into public.profiles (
    id,
    name,
    email,
    organization,
    cohort,
    role,
    category,
    voucher_code,
    default_language,
    active,
    created_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'organization', ''),
    coalesce(new.raw_user_meta_data ->> 'cohort', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'Candidat'),
    coalesce(new.raw_user_meta_data ->> 'category', 'formation'),
    voucher,
    coalesce(new.raw_user_meta_data ->> 'default_language', 'fr'),
    true,
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    organization = excluded.organization,
    cohort = excluded.cohort,
    role = excluded.role,
    category = excluded.category,
    voucher_code = excluded.voucher_code,
    default_language = excluded.default_language,
    active = excluded.active;

  if voucher <> '' then
    update public.vouchers
    set status = 'used',
        used_by = new.email,
        used_at = now()
    where code = voucher
      and status <> 'used'
      and (
        coalesce(assigned_to, '') = ''
        or lower(assigned_to) = lower(new.email)
      );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_exam_profile on auth.users;
create trigger on_auth_user_created_exam_profile
after insert on auth.users
for each row execute function public.handle_new_exam_user();

alter table public.profiles enable row level security;
alter table public.vouchers enable row level security;
alter table public.voucher_settings enable row level security;
alter table public.exam_lots enable row level security;
alter table public.question_bank enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.attempt_limits enable row level security;
alter table public.email_queue enable row level security;

-- Prototype policies for the current static GitHub Pages app.
-- For stricter production security, replace trainer writes with Supabase Edge Functions.

drop policy if exists "profiles_select_for_trainer_dashboard" on public.profiles;
create policy "profiles_select_for_trainer_dashboard"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "profiles_insert_own_account" on public.profiles;
create policy "profiles_insert_own_account"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own_account" on public.profiles;
create policy "profiles_update_own_account"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "vouchers_public_select" on public.vouchers;
create policy "vouchers_public_select"
on public.vouchers for select
to anon, authenticated
using (true);

drop policy if exists "vouchers_trainer_insert_from_static_app" on public.vouchers;
create policy "vouchers_trainer_insert_from_static_app"
on public.vouchers for insert
to anon, authenticated
with check (true);

drop policy if exists "vouchers_use_own_assigned_code" on public.vouchers;
create policy "vouchers_use_own_assigned_code"
on public.vouchers for update
to authenticated
using (
  status <> 'used'
  and (
    coalesce(assigned_to, '') = ''
    or lower(assigned_to) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (status = 'used');

drop policy if exists "voucher_settings_public_read_write" on public.voucher_settings;
create policy "voucher_settings_public_read_write"
on public.voucher_settings for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "exam_lots_public_select" on public.exam_lots;
create policy "exam_lots_public_select"
on public.exam_lots for select
to anon, authenticated
using (active = true);

drop policy if exists "exam_lots_trainer_write_from_static_app" on public.exam_lots;
create policy "exam_lots_trainer_write_from_static_app"
on public.exam_lots for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "question_bank_public_select" on public.question_bank;
create policy "question_bank_public_select"
on public.question_bank for select
to anon, authenticated
using (active = true);

drop policy if exists "question_bank_trainer_write_from_static_app" on public.question_bank;
create policy "question_bank_trainer_write_from_static_app"
on public.question_bank for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "attempts_public_read_write" on public.attempts;
create policy "attempts_public_read_write"
on public.attempts for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "attempt_answers_public_read_write" on public.attempt_answers;
create policy "attempt_answers_public_read_write"
on public.attempt_answers for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "attempt_limits_public_read_write" on public.attempt_limits;
create policy "attempt_limits_public_read_write"
on public.attempt_limits for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "email_queue_public_insert_read" on public.email_queue;
create policy "email_queue_public_insert_read"
on public.email_queue for all
to anon, authenticated
using (true)
with check (true);
