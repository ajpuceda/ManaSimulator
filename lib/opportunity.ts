import type { BotSettings, ManifoldMarket } from "./types";
import type { MistralAnalysis } from "./mistral";

export interface OpportunityMetrics {
  market_id: string;
  outcome: "YES" | "NO";
  market_probability: number;
  ai_probability: number;
  edge_pp: number;
  confidence_score: number;
  entry_price: number;
  expected_value_per_mana: number;
  kelly_fraction: number;
  recommended_size: number;
  est_fee_mana: number;
  liquidity_impact: number;
  slippage_adjusted_price: number;
  risk_reward: number;
  passes_min_edge: boolean;
}

export interface KellyParams {
  aiProbability: number;
  price: number;
  kellyScale?: number;
}

export function kellyFraction({ aiProbability, price, kellyScale = 0.25 }: KellyParams): number {
  if (price <= 0 || price >= 1) return 0;
  const b = (1 - price) / price;
  const f = (aiProbability * b - (1 - aiProbability)) / b;
  return Math.max(0, Math.min(1, f * kellyScale));
}

export function estimateSlippage(orderSize: number, liquidity?: number): number {
  if (!liquidity || liquidity <= 0) return 0;
  return Math.min(0.05, orderSize / (liquidity * 4));
}

export function computeOpportunity(params: {
  market: ManifoldMarket;
  analysis: MistralAnalysis;
  settings: BotSettings;
  feePct?: number;
}): OpportunityMetrics {
  const { market, analysis, settings, feePct = 0 } = params;
  const aiYes = analysis.estimated_probability_yes;
  const marketYes = market.probability;
  const edgeYes = aiYes - marketYes;

  const outcome: "YES" | "NO" = edgeYes >= 0 ? "YES" : "NO";
  const aiProb = outcome === "YES" ? aiYes : 1 - aiYes;
  const price = outcome === "YES" ? marketYes : 1 - marketYes;
  const edge = Math.abs(edgeYes);

  const entryPrice = Math.min(0.99, Math.max(0.01, price));
  const evPerMana = aiProb * (1 / entryPrice - 1) - (1 - aiProb);
  const kelly = kellyFraction({ aiProbability: aiProb, price: entryPrice });
  const baseSize = kelly * 100;
  const size = Math.max(0, Math.min(settings.max_position_size, baseSize, 30));
  const fee = size * feePct;
  const slippage = estimateSlippage(size, market.liquidity);
  const adjustedPrice = Math.min(0.99, entryPrice * (1 + slippage));
  const adjustedEv = aiProb * (1 / adjustedPrice - 1) - (1 - aiProb);
  const riskReward = (1 - entryPrice) / entryPrice;

  return {
    market_id: market.id,
    outcome,
    market_probability: marketYes,
    ai_probability: aiProb,
    edge_pp: edge * 100,
    confidence_score: analysis.confidence_score,
    entry_price: entryPrice,
    expected_value_per_mana: adjustedEv,
    kelly_fraction: kelly,
    recommended_size: Math.round(size * 100) / 100,
    est_fee_mana: fee,
    liquidity_impact: slippage,
    slippage_adjusted_price: adjustedPrice,
    risk_reward: riskReward,
    passes_min_edge: edge * 100 >= settings.min_edge_pct,
  };
}
