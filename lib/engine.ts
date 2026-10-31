import type { BotSettings, ManifoldMarket, AiAnalysis } from "./types";

export const DEFAULT_SETTINGS: Omit<BotSettings, "user_id" | "updated_at"> = {
  max_position_size: 50,
  max_daily_allocation_pct: 15,
  min_edge_pct: 8,
  max_open_positions: 10,
  scan_interval_minutes: 15,
  automation_enabled: false,
  dry_run: true,
};

export interface TradeDecision {
  action: "BUY_YES" | "BUY_NO" | "SKIP";
  size: number;
  reasons: string[];
}

export function computeEdge(market: ManifoldMarket, analysis: AiAnalysis): number {
  return (analysis.ai_probability - market.probability) * 100;
}

export function decideTrade(params: {
  market: ManifoldMarket;
  analysis: AiAnalysis;
  settings: BotSettings;
  balance: number;
  openPositions: number;
  dailyAllocated: number;
}): TradeDecision {
  const { market, analysis, settings, balance, openPositions, dailyAllocated } = params;
  const reasons: string[] = [];
  const edge = computeEdge(market, analysis);

  if (settings.dry_run) reasons.push("dry-run mode: no real Mana will be spent");
  if (!settings.automation_enabled) {
    reasons.push("automation disabled: decision recorded only");
    return { action: "SKIP", size: 0, reasons };
  }
  if (openPositions >= settings.max_open_positions) {
    reasons.push(`max open positions reached (${settings.max_open_positions})`);
    return { action: "SKIP", size: 0, reasons };
  }
  if (Math.abs(edge) < settings.min_edge_pct) {
    reasons.push(`edge ${edge.toFixed(1)}pp below minimum ${settings.min_edge_pct}pp`);
    return { action: "SKIP", size: 0, reasons };
  }

  const dailyBudget = (balance * settings.max_daily_allocation_pct) / 100;
  const remainingDaily = Math.max(0, dailyBudget - dailyAllocated);
  const direction: "BUY_YES" | "BUY_NO" = edge > 0 ? "BUY_YES" : "BUY_NO";
  let size = Math.min(30, settings.max_position_size, remainingDaily, balance);
  if (size < 10) {
    reasons.push(`available size ${size.toFixed(1)} below minimum trade size of 10`);
    return { action: "SKIP", size: 0, reasons };
  }
  reasons.push(`edge ${edge.toFixed(1)}pp in favor of ${direction}`);
  return { action: direction, size, reasons };
}
