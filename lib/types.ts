export type TradeOutcome = "YES" | "NO";

export interface ManifoldMarket {
  id: string;
  question: string;
  description?: string;
  url: string;
  probability: number;
  volume: number;
  volume24h?: number;
  liquidity?: number;
  closeTime?: number;
  creatorName?: string;
  category?: string;
  isResolved: boolean;
  resolution?: string;
}

export interface AiAnalysis {
  id: string;
  market_id: string;
  market_probability: number;
  ai_probability: number;
  edge: number;
  confidence: number;
  expected_value: number;
  risk_factors: string[];
  evidence: string[];
  recommendation: "BUY_YES" | "BUY_NO" | "HOLD" | "SKIP";
  reasoning: string;
  created_at: string;
}

export interface Position {
  id: string;
  market_id: string;
  market_question: string;
  outcome: TradeOutcome;
  entry_price: number;
  current_price: number;
  mana_invested: number;
  unrealized_pl: number;
  realized_pl: number;
  status: "open" | "closed";
  opened_at: string;
  closed_at?: string;
}

export interface Trade {
  id: string;
  market_id: string;
  market_question: string;
  type: "BUY" | "SELL" | "DRY_RUN_BUY" | "DRY_RUN_SELL";
  outcome: TradeOutcome;
  amount_mana: number;
  price: number;
  result?: string;
  created_at: string;
}

export interface BotSettings {
  user_id: string;
  max_position_size: number;
  max_daily_allocation_pct: number;
  min_edge_pct: number;
  max_open_positions: number;
  scan_interval_minutes: number;
  automation_enabled: boolean;
  dry_run: boolean;
  updated_at: string;
}

export interface DashboardStats {
  total_balance: number;
  portfolio_value: number;
  total_pl: number;
  daily_pl: number;
  roi_pct: number;
  open_positions: number;
  total_trades: number;
  win_rate: number;
  agent_status: "idle" | "scanning" | "analyzing" | "disabled" | "error";
}

export interface ServiceStatus {
  manifold: boolean;
  mistral: boolean;
  supabase: boolean;
}
