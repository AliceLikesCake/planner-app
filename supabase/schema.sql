-- Planner App schema for Supabase (Postgres)
-- Run in Supabase Dashboard > SQL Editor.
-- Every table is scoped to the signed-in user with Row Level Security.

create extension if not exists "pgcrypto";

-- ---------- settings ----------
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lang text not null default 'zh-TW' check (lang in ('zh-TW', 'en')),
  week_start text not null default 'mon' check (week_start in ('mon', 'sun')),
  dark boolean not null default false,
  sound boolean not null default true,
  push boolean not null default true,
  remind_deliver boolean not null default true,
  remind_overdue boolean not null default true,
  habit_remind_time time not null default '21:30',
  auto_sync_calendar boolean not null default true,
  auto_sync_money boolean not null default true,
  rollover_tasks boolean not null default true,
  budget_total integer not null default 25000,
  budget_by_category jsonb not null default '{}'::jsonb,
  budget_warn boolean not null default true,
  month_start_day smallint not null default 1,
  cakes_by_weekday jsonb not null default '["classic","crepe","cupcake","sundae","pudding","pancake","tier"]'::jsonb,
  cakes_random_weekly boolean not null default false,
  max_layers smallint not null default 8,
  updated_at timestamptz not null default now()
);

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('task', 'event', 'expense', 'income')),
  key text,                       -- built-in key: work, gig, study, life, health, date, travel, food...
  name_zh text not null,
  name_en text not null,
  color text not null,            -- palette key: blue, lav, green, peach, butter, rose, mint, pink, sand
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- gigs (接案 / 業配) ----------
create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  product_category text not null check (product_category in ('beauty', 'skin', 'food', 'home', 'tech', 'fashion')),
  formats text[] not null default '{}',   -- ig_post, ig_reels, story, threads, youtube
  amount integer not null default 0,      -- before tax, TWD
  contact text,
  note text,
  deliver_date date,
  live_date date,
  due_date date,
  contract_signed boolean not null default false,
  labor_signed boolean not null default false,
  delivered boolean not null default false,
  is_live boolean not null default false,
  paid_at date,
  sync_calendar boolean not null default true,
  sync_todo boolean not null default true,
  sync_docs boolean not null default true,
  sync_money boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- events ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category_id uuid references public.categories(id) on delete set null,
  start_date date not null,
  end_date date not null,
  all_day boolean not null default true,
  start_time time,
  end_time time,
  place text,
  remind text not null default 'none' check (remind in ('none', 'hour', 'day', 'week')),
  add_to_today boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'gig')),
  gig_id uuid references public.gigs(id) on delete cascade,
  gig_kind text check (gig_kind in ('deliver', 'live', 'due')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create unique index if not exists events_gig_kind_uniq on public.events (gig_id, gig_kind) where gig_id is not null;

-- ---------- tasks ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category_id uuid references public.categories(id) on delete set null,
  date date not null,
  time time,
  repeat text not null default 'none' check (repeat in ('none', 'day', 'week', 'month')),
  remind boolean not null default false,
  show_in_calendar boolean not null default true,
  note text,
  done boolean not null default false,
  done_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'gig', 'event')),
  gig_id uuid references public.gigs(id) on delete cascade,
  gig_kind text check (gig_kind in ('prep_deliver', 'check_live', 'sign_docs')),
  event_id uuid references public.events(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_date on public.tasks (user_id, date);
create unique index if not exists tasks_gig_kind_uniq on public.tasks (gig_id, gig_kind) where gig_id is not null;
create unique index if not exists tasks_event_date_uniq on public.tasks (event_id, date) where event_id is not null;

-- Completions of repeating tasks, one row per day ticked (DECISIONS 4).
-- A non-repeating task keeps using tasks.done / tasks.done_at.
create table if not exists public.task_completions (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  done_at timestamptz not null default now(),
  primary key (task_id, date)
);

-- ---------- habits ----------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text,
  color text not null default 'blue',
  weekdays smallint[] not null default '{1,2,3,4,5,6,7}',  -- 1 = Monday ... 7 = Sunday
  remind boolean not null default true,
  sort smallint not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  done boolean not null default true,
  primary key (habit_id, date)
);

-- ---------- transactions ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount integer not null check (amount >= 0),
  category_id uuid references public.categories(id) on delete set null,
  date date not null,
  note text,
  gig_id uuid references public.gigs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date on public.transactions (user_id, date);
create unique index if not exists transactions_gig_uniq on public.transactions (gig_id) where gig_id is not null;

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['settings','categories','gigs','events','tasks','task_completions','habits','habit_logs','transactions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
