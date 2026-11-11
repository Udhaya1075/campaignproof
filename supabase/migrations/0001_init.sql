-- CampaignProof schema. Run in Supabase SQL Editor (or `supabase db push`).
create extension if not exists "pgcrypto";

-- Shared updated_at trigger
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Buffer connection (non-secret metadata, owner can read) ----------
create table public.buffer_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  buffer_account_id text,
  buffer_email text,
  organization_id text,
  organization_name text,
  scopes text,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Buffer tokens (ENCRYPTED, service role only: RLS on, NO policies) ----------
create table public.buffer_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------- Campaigns ----------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  status text not null default 'draft' check (status in ('draft','active','completed','archived')),
  is_demo boolean not null default false,
  product_name text,
  approved_price numeric(14,2) check (approved_price is null or approved_price >= 0),
  original_price numeric(14,2) check (original_price is null or original_price >= 0),
  currency text not null default 'INR',
  discount_percent numeric(5,2) check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  start_date date,
  end_date date,
  official_url text,
  additional_rules text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or start_date <= end_date)
);
create index campaigns_user_idx on public.campaigns(user_id, created_at desc);

-- required info / approved claims / extra rules
create table public.campaign_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  kind text not null check (kind in ('required_info','approved_claim')),
  value text not null check (char_length(value) between 1 and 300),
  created_at timestamptz not null default now()
);
create index campaign_facts_campaign_idx on public.campaign_facts(campaign_id);

create table public.campaign_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  kind text not null check (kind in ('required','prohibited')),
  phrase text not null check (char_length(phrase) between 1 and 300),
  created_at timestamptz not null default now()
);
create index campaign_phrases_campaign_idx on public.campaign_phrases(campaign_id);

create table public.campaign_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  channel_id text not null,
  channel_name text,
  service text,
  created_at timestamptz not null default now(),
  unique (campaign_id, channel_id)
);

-- ---------- Post snapshots selected for a campaign ----------
create table public.campaign_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  is_demo boolean not null default false,
  buffer_post_id text,
  channel_id text,
  channel_name text,
  service text,
  text text not null,
  status text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index campaign_posts_unique_buffer on public.campaign_posts(campaign_id, buffer_post_id) where buffer_post_id is not null;
create index campaign_posts_campaign_idx on public.campaign_posts(campaign_id);

-- ---------- Audits ----------
create table public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  is_demo boolean not null default false,
  status text not null default 'completed' check (status in ('running','completed','failed')),
  total_posts integer not null default 0,
  passed_posts integer not null default 0,
  failed_posts integer not null default 0,
  critical_count integer not null default 0,
  high_count integer not null default 0,
  medium_count integer not null default 0,
  low_count integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index audit_runs_user_idx on public.audit_runs(user_id, created_at desc);
create index audit_runs_campaign_idx on public.audit_runs(campaign_id);

create table public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.audit_runs(id) on delete cascade,
  campaign_post_id uuid references public.campaign_posts(id) on delete set null,
  rule_id text not null,
  category text not null,
  severity text not null check (severity in ('critical','high','medium','low')),
  detected_value text,
  expected_value text,
  excerpt text,
  start_index integer,
  end_index integer,
  explanation text not null,
  suggestion text not null,
  replacement text,
  channel_name text,
  created_at timestamptz not null default now()
);
create index audit_findings_run_idx on public.audit_findings(run_id);
create index audit_findings_post_idx on public.audit_findings(campaign_post_id);

-- ---------- Corrections ----------
create table public.corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_post_id uuid not null references public.campaign_posts(id) on delete cascade,
  run_id uuid references public.audit_runs(id) on delete set null,
  original_text text not null,
  corrected_text text not null,
  status text not null default 'draft' check (status in ('draft','approved','rejected','applied','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_at timestamptz
);
create index corrections_post_idx on public.corrections(campaign_post_id, created_at desc);
create index corrections_user_idx on public.corrections(user_id, created_at desc);

-- ---------- updated_at triggers ----------
create trigger t_profiles_u before update on public.profiles for each row execute function public.set_updated_at();
create trigger t_bconn_u before update on public.buffer_connections for each row execute function public.set_updated_at();
create trigger t_btok_u before update on public.buffer_tokens for each row execute function public.set_updated_at();
create trigger t_camp_u before update on public.campaigns for each row execute function public.set_updated_at();
create trigger t_cpost_u before update on public.campaign_posts for each row execute function public.set_updated_at();
create trigger t_corr_u before update on public.corrections for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.buffer_connections enable row level security;
alter table public.buffer_tokens enable row level security; -- no policies on purpose
alter table public.campaigns enable row level security;
alter table public.campaign_facts enable row level security;
alter table public.campaign_phrases enable row level security;
alter table public.campaign_channels enable row level security;
alter table public.campaign_posts enable row level security;
alter table public.audit_runs enable row level security;
alter table public.audit_findings enable row level security;
alter table public.corrections enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- connection metadata: owner may read; writes happen only through the service role
create policy bconn_select on public.buffer_connections for select to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['campaigns','campaign_facts','campaign_phrases','campaign_channels','campaign_posts','audit_runs','audit_findings','corrections']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())', t||'_delete', t);
  end loop;
end $$;

-- Child rows must reference a parent owned by the same user
create or replace function public.assert_same_owner() returns trigger
language plpgsql as $$
declare parent_owner uuid;
begin
  if tg_table_name in ('campaign_facts','campaign_phrases','campaign_channels','campaign_posts','audit_runs') then
    select user_id into parent_owner from public.campaigns where id = new.campaign_id;
  elsif tg_table_name = 'audit_findings' then
    select user_id into parent_owner from public.audit_runs where id = new.run_id;
  elsif tg_table_name = 'corrections' then
    select user_id into parent_owner from public.campaign_posts where id = new.campaign_post_id;
  end if;
  if parent_owner is null or parent_owner <> new.user_id then
    raise exception 'parent row not found or owned by another user';
  end if;
  return new;
end $$;

create trigger o_facts before insert or update on public.campaign_facts for each row execute function public.assert_same_owner();
create trigger o_phr before insert or update on public.campaign_phrases for each row execute function public.assert_same_owner();
create trigger o_chan before insert or update on public.campaign_channels for each row execute function public.assert_same_owner();
create trigger o_cpost before insert or update on public.campaign_posts for each row execute function public.assert_same_owner();
create trigger o_runs before insert or update on public.audit_runs for each row execute function public.assert_same_owner();
create trigger o_find before insert or update on public.audit_findings for each row execute function public.assert_same_owner();
create trigger o_corr before insert or update on public.corrections for each row execute function public.assert_same_owner();
