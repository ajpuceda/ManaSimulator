-- Migration 002: autonomous trading engine support

alter table bot_settings
  add column if not exists mode text not null default 'DRY_RUN',
  add column if not exists max_daily_loss_pct numeric not null default 5,
  add column if not exists min_liquidity_mana numeric not null default 500,
  add column if not exists emergency_stop boolean not null default false;

alter table trades
  add column if not exists idempotency_key text;

create unique index if not exists idx_trades_idempotency on trades(idempotency_key) where idempotency_key is not null;

create table if not exists decision_logs (
  id uuid primary key default gen_random_uuid(),
  market_id text not null,
  market_question text not null,
  mode text not null,
  analysis jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  risk_checks jsonb not null default '[]'::jsonb,
  decision text not null,
  reasons jsonb not null default '[]'::jsonb,
  execution_result text,
  created_at timestamptz not null default now()
);
create index if not exists idx_decision_logs_created on decision_logs(created_at desc);
create index if not exists idx_decision_logs_market on decision_logs(market_id);

alter table decision_logs enable row level security;

-- Timestamped AI predictions for calibration tracking (append-only by convention)
create table if not exists ai_predictions (
  id uuid primary key default gen_random_uuid(),
  market_id text not null,
  estimated_probability_yes numeric not null,
  confidence_score numeric not null,
  market_probability_at_prediction numeric not null,
  final_outcome text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_predictions_market on ai_predictions(market_id);
alter table ai_predictions enable row level security;
