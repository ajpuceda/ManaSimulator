-- ManaSimulator database schema (run in the Supabase SQL editor)

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  manifold_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bot_settings (
  user_id uuid primary key references users(id) on delete cascade,
  max_position_size numeric not null default 50,
  max_daily_allocation_pct numeric not null default 15,
  min_edge_pct numeric not null default 8,
  max_open_positions integer not null default 10,
  scan_interval_minutes integer not null default 15,
  automation_enabled boolean not null default false,
  dry_run boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists markets (
  id text primary key,
  question text not null,
  description text,
  url text,
  probability numeric,
  volume numeric default 0,
  liquidity numeric default 0,
  close_time timestamptz,
  category text,
  is_resolved boolean default false,
  fetched_at timestamptz not null default now()
);

create table if not exists ai_analyses (
  id uuid primary key default gen_random_uuid(),
  market_id text not null references markets(id) on delete cascade,
  market_probability numeric not null,
  ai_probability numeric not null,
  edge numeric not null,
  confidence numeric not null,
  expected_value numeric default 0,
  risk_factors jsonb default '[]'::jsonb,
  evidence jsonb default '[]'::jsonb,
  recommendation text not null,
  reasoning text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_analyses_market on ai_analyses(market_id);
create index if not exists idx_ai_analyses_created on ai_analyses(created_at desc);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  market_id text not null,
  market_question text not null,
  type text not null,
  outcome text not null,
  amount_mana numeric not null,
  price numeric not null,
  result text,
  created_at timestamptz not null default now()
);
create index if not exists idx_trades_created on trades(created_at desc);

create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  market_id text not null,
  market_question text not null,
  outcome text not null,
  entry_price numeric not null,
  current_price numeric not null default 0,
  mana_invested numeric not null,
  unrealized_pl numeric not null default 0,
  realized_pl numeric not null default 0,
  status text not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists idx_positions_status on positions(status);

create table if not exists portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  balance numeric not null,
  portfolio_value numeric not null,
  total_pl numeric not null default 0,
  taken_at timestamptz not null default now()
);
create index if not exists idx_snapshots_taken on portfolio_snapshots(taken_at desc);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  event text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_logs_created on agent_logs(created_at desc);

alter table users enable row level security;
alter table bot_settings enable row level security;
alter table markets enable row level security;
alter table ai_analyses enable row level security;
alter table trades enable row level security;
alter table positions enable row level security;
alter table portfolio_snapshots enable row level security;
alter table agent_logs enable row level security;
