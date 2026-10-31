import type { BotSettings } from "./types";

export interface RiskContext {
  balance: number;
  portfolioValue: number;
  openPositions: number;
  dailyAllocated: number;
  dailyRealizedLoss: number;
  marketLiquidity?: number;
  marketResolved: boolean;
  marketCloseTime?: number;
  minutesToClose?: number;
}

export interface RiskCheck {
  passed: boolean;
  failedChecks: string[];
}

export const MIN_LIQUIDITY_MANA = 500;
export const MIN_MINUTES_TO_CLOSE = 60;
export const DEFAULT_MAX_DAILY_LOSS_PCT = 5;

export function checkRisk(settings: BotSettings, ctx: RiskContext, proposedSize: number): RiskCheck {
  const failed: string[] = [];

  if (settings.emergency_stop) failed.push("emergency stop is active");
  if (proposedSize > settings.max_position_size) failed.push(`size ${proposedSize} exceeds max position ${settings.max_position_size}`);
  if (proposedSize < 10) failed.push(`size ${proposedSize} below minimum trade size 10`);
  if (proposedSize > ctx.balance) failed.push("proposed size exceeds available balance");
  if (ctx.openPositions >= settings.max_open_positions) failed.push(`max open positions (${settings.max_open_positions}) reached`);

  const dailyBudget = (ctx.portfolioValue * settings.max_daily_allocation_pct) / 100;
  if (ctx.dailyAllocated + proposedSize > dailyBudget) failed.push("daily allocation budget exhausted");

  const maxDailyLoss = (ctx.portfolioValue * (settings.max_daily_loss_pct ?? DEFAULT_MAX_DAILY_LOSS_PCT)) / 100;
  if (ctx.dailyRealizedLoss <= -maxDailyLoss) failed.push(`daily loss threshold reached (${ctx.dailyRealizedLoss.toFixed(2)} Mana)`);

  if (ctx.marketResolved) failed.push("market is resolved/closed");
  if (ctx.marketLiquidity !== undefined && ctx.marketLiquidity < MIN_LIQUIDITY_MANA) failed.push(`market illiquid (${ctx.marketLiquidity} Mana < ${MIN_LIQUIDITY_MANA})`);
  if (ctx.minutesToClose !== undefined && ctx.minutesToClose < MIN_MINUTES_TO_CLOSE) failed.push(`market closes in ${ctx.minutesToClose} min (< ${MIN_MINUTES_TO_CLOSE})`);

  return { passed: failed.length === 0, failedChecks: failed };
}
