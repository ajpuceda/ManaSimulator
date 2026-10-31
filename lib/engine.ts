import type { BotSettings, ManifoldMarket, OperatingMode } from "./types";

export const DEFAULT_SETTINGS: Omit<BotSettings, "user_id" | "updated_at"> = {
  mode: "DRY_RUN",
  max_position_size: 50,
  max_daily_allocation_pct: 15,
  min_edge_pct: 8,
  max_open_positions: 10,
  max_daily_loss_pct: 5,
  min_liquidity_mana: 500,
  scan_interval_minutes: 30,
  automation_enabled: false,
  emergency_stop: false,
  dry_run: true,
};

export function normalizeMode(mode: string | undefined): OperatingMode {
  if (mode === "ANALYSIS_ONLY" || mode === "DRY_RUN" || mode === "LIVE") return mode;
  return "DRY_RUN";
}

export interface EngineDecision {
  action: "BUY_YES" | "BUY_NO" | "SKIP";
  size: number;
  reasons: string[];
}

export function computeEdge(marketProb: number, aiProbYes: number): number {
  return (aiProbYes - marketProb) * 100;
}

export function decideTrade(params: {
  market: ManifoldMarket;
  edgePp: number;
  settings: BotSettings;
  balance: number;
  openPositions: number;
  dailyAllocated: number;
  kellySize: number;
}): EngineDecision {
  const { market, edgePp, settings, balance, openPositions, dailyAllocated, kellySize } = params;
  const reasons: string[] = [];

  if (settings.emergency_stop) {
    reasons.push("emergency stop active");
    return { action: "SKIP", size: 0, reasons };
  }
  if (settings.mode === "ANALYSIS_ONLY") {
    reasons.push("mode is ANALYSIS_ONLY: no trading decisions");
    return { action: "SKIP", size: 0, reasons };
  }
  if (!settings.automation_enabled) {
    reasons.push("automation disabled");
    return { action: "SKIP", size: 0, reasons };
  }
  if (market.isResolved) {
    reasons.push("market resolved");
    return { action: "SKIP", size: 0, reasons };
  }
  if (openPositions >= settings.max_open_positions) {
    reasons.push(`max open positions reached (${settings.max_open_positions})`);
    return { action: "SKIP", size: 0, reasons };
  }
  if (Math.abs(edgePp) < settings.min_edge_pct) {
    reasons.push(`edge ${edgePp.toFixed(1)}pp below minimum ${settings.min_edge_pct}pp`);
    return { action: "SKIP", size: 0, reasons };
  }

  const dailyBudget = (balance * settings.max_daily_allocation_pct) / 100;
  const remainingDaily = Math.max(0, dailyBudget - dailyAllocated);
  const direction: "BUY_YES" | "BUY_NO" = edgePp > 0 ? "BUY_YES" : "BUY_NO";
  const size = Math.min(30, settings.max_position_size, remainingDaily, balance, kellySize);
  if (size < 10) {
    reasons.push(`computed size ${size.toFixed(1)} below minimum trade size of 10`);
    return { action: "SKIP", size: 0, reasons };
  }
  reasons.push(`edge ${edgePp.toFixed(1)}pp in favor of ${direction}; Kelly size ${kellySize.toFixed(1)}`);
  return { action: direction, size: Math.round(size * 100) / 100, reasons };
}
