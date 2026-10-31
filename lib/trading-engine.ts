import "server-only";
import { createHash } from "crypto";
import { getSupabase } from "./supabase";
import { getBalance, getMarket, listMarkets, placeBet } from "./manifold";
import { analyzeMarket } from "./mistral";
import { computeOpportunity } from "./opportunity";
import { checkRisk } from "./risk";
import { decideTrade, DEFAULT_SETTINGS } from "./engine";
import type { BotSettings, DecisionLog, ManifoldMarket, OperatingMode, TradeOutcome } from "./types";

export const DEMO_USER = "00000000-0000-0000-0000-000000000001";

export function idempotencyKey(marketId: string, outcome: TradeOutcome, cycle: string): string {
  return createHash("sha256").update(`${marketId}:${outcome}:${cycle}`).digest("hex");
}

async function loadSettings(): Promise<BotSettings> {
  try {
    const { data } = await getSupabase()
      .from("bot_settings")
      .select("*")
      .eq("user_id", DEMO_USER)
      .maybeSingle();
    if (data) return data as BotSettings;
  } catch (err) {
    console.error("[engine] settings load failed, using defaults:", err);
  }
  return { ...DEFAULT_SETTINGS, user_id: DEMO_USER, updated_at: new Date().toISOString() };
}

async function logDecision(entry: Omit<DecisionLog, "id" | "created_at">) {
  try {
    await getSupabase().from("decision_logs").insert(entry);
  } catch (err) {
    console.error("[engine] decision log insert failed:", err);
  }
}

async function recordTrade(row: Record<string, unknown>) {
  try {
    await getSupabase().from("trades").insert(row);
  } catch (err) {
    console.error("[engine] trade insert failed:", err);
  }
}

async function upsertPosition(row: Record<string, unknown>) {
  try {
    await getSupabase().from("positions").upsert(row, { onConflict: "id" });
  } catch (err) {
    console.error("[engine] position upsert failed:", err);
  }
}

function minutesToClose(market: ManifoldMarket): number | undefined {
  if (!market.closeTime) return undefined;
  return Math.floor((market.closeTime - Date.now()) / 60000);
}

async function alreadyDecidedThisCycle(marketId: string, cycle: string): Promise<boolean> {
  try {
    const { data } = await getSupabase()
      .from("decision_logs")
      .select("id")
      .eq("market_id", marketId)
      .gte("created_at", cycle)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export interface ScanCycleResult {
  cycle: string;
  mode: OperatingMode;
  scanned: number;
  analyzed: number;
  decisions: { market: string; decision: string; reasons: string[] }[];
  errors: string[];
}

export async function runScanCycle(): Promise<ScanCycleResult> {
  const cycle = new Date().toISOString();
  const settings = await loadSettings();
  const result: ScanCycleResult = {
    cycle,
    mode: settings.mode,
    scanned: 0,
    analyzed: 0,
    decisions: [],
    errors: [],
  };

  if (settings.emergency_stop) {
    result.errors.push("emergency stop active — cycle skipped");
    return result;
  }
  if (!settings.automation_enabled) {
    result.errors.push("automation disabled — cycle skipped");
    return result;
  }

  let balance = 0;
  try {
    balance = (await getBalance()).balance;
  } catch (err) {
    result.errors.push(`balance verification failed: ${(err as Error).message} — aborting cycle`);
    return result;
  }

  let openCount = 0;
  let dailyAllocated = 0;
  let dailyLoss = 0;
  try {
    const supabase = getSupabase();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const [pos, todayTrades] = await Promise.all([
      supabase.from("positions").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("trades").select("amount_mana").gte("created_at", dayStart.toISOString()),
    ]);
    openCount = pos.count ?? 0;
    dailyAllocated = (todayTrades.data ?? []).reduce((s: number, t: { amount_mana: number }) => s + Number(t.amount_mana), 0);
    dailyLoss = 0;
  } catch (err) {
    result.errors.push(`portfolio state fetch failed: ${(err as Error).message}`);
  }

  let markets: ManifoldMarket[] = [];
  try {
    markets = await listMarkets(100);
  } catch (err) {
    result.errors.push(`market fetch failed: ${(err as Error).message}`);
    return result;
  }
  result.scanned = markets.length;

  markets.sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0));

  for (const market of markets.slice(0, 25)) {
    try {
      if (market.isResolved) continue;
      if ((market.liquidity ?? 0) < settings.min_liquidity_mana) continue;
      const mtc = minutesToClose(market);
      if (mtc !== undefined && mtc < 60) continue;
      if (await alreadyDecidedThisCycle(market.id, cycle)) continue;

      const analysis = await analyzeMarket({
        question: market.question,
        description: market.description,
        marketProbability: market.probability,
        liquidity: market.liquidity,
        volume: market.volume,
        closeTime: market.closeTime,
      });
      result.analyzed++;

      const metrics = computeOpportunity({ market, analysis, settings });
      const risk = checkRisk(settings, {
        balance,
        portfolioValue: balance,
        openPositions: openCount,
        dailyAllocated,
        dailyRealizedLoss: dailyLoss,
        marketLiquidity: market.liquidity,
        marketResolved: market.isResolved,
        minutesToClose: mtc,
      }, metrics.recommended_size);

      const decision = decideTrade({
        market,
        edgePp: metrics.edge_pp * (metrics.outcome === "YES" ? 1 : -1),
        settings,
        balance,
        openPositions: openCount,
        dailyAllocated,
        kellySize: metrics.recommended_size,
      });

      const shouldTrade = risk.passed && decision.action !== "SKIP" && metrics.passes_min_edge;
      const finalDecision = shouldTrade ? "EXECUTE" : "SKIP";
      const reasons = [...decision.reasons, ...risk.failedChecks];
      if (!metrics.passes_min_edge) reasons.push(`edge below ${settings.min_edge_pct}pp minimum`);

      await logDecision({
        market_id: market.id,
        market_question: market.question,
        mode: settings.mode,
        analysis: analysis as unknown as Record<string, unknown>,
        metrics: metrics as unknown as Record<string, unknown>,
        risk_checks: risk.failedChecks,
        decision: finalDecision,
        reasons,
      });

      if (shouldTrade) {
        const outcome: TradeOutcome = decision.action === "BUY_YES" ? "YES" : "NO";
        const key = idempotencyKey(market.id, outcome, cycle);
        const dup = await getSupabase().from("trades").select("id").eq("idempotency_key", key).maybeSingle();
        if (dup.data) {
          reasons.push("duplicate order prevented by idempotency key");
        } else if (settings.mode === "LIVE") {
          const bet = await placeBet({
            marketId: market.id,
            outcome,
            amount: decision.size,
            limitPrice: metrics.slippage_adjusted_price,
            idempotencyKey: key,
          });
          const newBalance = (await getBalance()).balance;
          await recordTrade({
            market_id: market.id,
            market_question: market.question,
            type: "BUY",
            outcome,
            amount_mana: decision.size,
            price: metrics.entry_price,
            result: bet.success ? `executed betId=${bet.betId} balance_after=${newBalance}` : `FAILED: ${bet.error}`,
            idempotency_key: key,
          });
          await upsertPosition({
            id: key,
            market_id: market.id,
            market_question: market.question,
            outcome,
            entry_price: metrics.entry_price,
            current_price: market.probability,
            mana_invested: decision.size,
            unrealized_pl: 0,
            realized_pl: 0,
            status: "open",
          });
          reasons.push(bet.success ? "LIVE order executed" : `LIVE order failed: ${bet.error}`);
        } else {
          await recordTrade({
            market_id: market.id,
            market_question: market.question,
            type: "DRY_RUN_BUY",
            outcome,
            amount_mana: decision.size,
            price: metrics.entry_price,
            result: "hypothetical trade recorded (dry-run)",
            idempotency_key: key,
          });
          reasons.push("hypothetical trade recorded (dry-run, not submitted to Manifold)");
        }
      }

      result.decisions.push({
        market: market.question.slice(0, 80),
        decision: finalDecision === "EXECUTE" ? decision.action : "SKIP",
        reasons,
      });
    } catch (err) {
      result.errors.push(`market ${market.id}: ${(err as Error).message}`);
    }
  }

  return result;
}

export async function evaluateOpenPositions(): Promise<{ evaluated: number; exits: string[] }> {
  const settings = await loadSettings();
  const exits: string[] = [];
  if (settings.emergency_stop || settings.mode === "ANALYSIS_ONLY") return { evaluated: 0, exits };
  try {
    const { data } = await getSupabase().from("positions").select("*").eq("status", "open");
    for (const pos of (data ?? []) as { id: string; market_id: string; market_question: string; outcome: TradeOutcome; entry_price: number; mana_invested: number }[]) {
      try {
        const market = await getMarket(pos.market_id);
        const currentPrice = pos.outcome === "YES" ? market.probability : 1 - market.probability;
        const unrealized = pos.mana_invested * (currentPrice / Math.max(0.01, pos.entry_price) - 1);
        await upsertPosition({ id: pos.id, current_price: currentPrice, unrealized_pl: unrealized });
        const mtc = minutesToClose(market);
        if (market.isResolved || (mtc !== undefined && mtc <= 0)) {
          const won = market.resolution === pos.outcome;
          const realized = won ? pos.mana_invested * (1 / Math.max(0.01, pos.entry_price) - 1) : -pos.mana_invested;
          await upsertPosition({ id: pos.id, status: "closed", realized_pl: realized, unrealized_pl: 0, closed_at: new Date().toISOString() });
          exits.push(`${pos.market_question}: resolved ${market.resolution}, realized ${realized.toFixed(2)}`);
        }
      } catch (err) {
        exits.push(`monitor error for ${pos.market_id}: ${(err as Error).message}`);
      }
    }
    return { evaluated: (data ?? []).length, exits };
  } catch (err) {
    return { evaluated: 0, exits: [`portfolio monitor failed: ${(err as Error).message}`] };
  }
}
