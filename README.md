# ManaSimulator

AI-powered prediction market trading dashboard for **Manifold Markets**, powered by **Mistral AI** with **Supabase** persistence. Runs in **dry-run / read-only mode** — no real Mana trades are executed.

## Architecture

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4** — frontend and backend in one project.
- **All API keys live server-side only** (`lib/env.ts`, `server-only` modules). No `NEXT_PUBLIC_` key variables exist.
- **API routes** (`app/api/*`): `/status`, `/markets`, `/markets/[id]`, `/analyze`, `/scan`, `/dashboard`, `/portfolio`, `/settings`.
- **Server clients**: `lib/manifold.ts` (Manifold v0 API with retry/backoff), `lib/mistral.ts` (structured JSON analysis), `lib/supabase.ts` (service-role client).
- **Trading rules engine**: `lib/engine.ts` enforces position size, daily allocation, min edge, and position limits. Dry-run is enforced server-side.
- **Pages**: Dashboard, Market Scanner, AI Analysis, Portfolio, Trading History, Settings.

## Environment variables

Copy `.env.example` to `.env.local` and fill in (never commit real values):

| Variable | Purpose |
| --- | --- |
| `MANIFOLD_API_KEY` | Manifold Markets API key (read-only usage) |
| `MISTRAL_API_KEY` | Mistral AI API key for market analysis |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `APP_URL` | App base URL |
| `CRON_SECRET` | Secret for future scheduled scan endpoint |

If credentials are missing, every page shows a setup notice listing exactly which variables are missing.

## Database setup

Run `supabase/schema.sql` in the Supabase SQL editor. It creates `users`, `bot_settings`, `markets`, `ai_analyses`, `trades`, `positions`, `portfolio_snapshots`, and `agent_logs` with indexes and RLS enabled.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

## Default trading configuration (dry-run)

- Max position size: 50 Mana · Normal trade size: 10–30 Mana
- Max simultaneous positions: 10
- Min AI edge: 8pp · Max daily allocation: 15% of portfolio
- No leverage · Never spend more than the available balance
- **Real trading is disabled**; order placement will be added in the next phase behind an explicit flag.
