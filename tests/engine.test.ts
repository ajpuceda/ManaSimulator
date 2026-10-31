import { kellyFraction, computeOpportunity, estimateSlippage } from "../lib/opportunity";
import { checkRisk } from "../lib/risk";
import { decideTrade, DEFAULT_SETTINGS } from "../lib/engine";
import type { BotSettings, ManifoldMarket } from "../lib/types";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  PASS ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL ${msg}`);
  }
}

const settings: BotSettings = { ...DEFAULT_SETTINGS, user_id: "t", updated_at: "" };
const market: ManifoldMarket = {
  id: "m1", question: "Will X happen?", url: "", probability: 0.5, volume: 10000, liquidity: 5000, isResolved: false,
};

console.log("kellyFraction:");
assert(kellyFraction({ aiProbability: 0.5, price: 0.5 }) === 0, "no edge -> zero Kelly");
assert(kellyFraction({ aiProbability: 0.9, price: 0.5 }) > 0, "positive edge -> positive Kelly");
assert(kellyFraction({ aiProbability: 0.9, price: 0.5 }) <= 0.25, "fractional Kelly capped by scale");
assert(kellyFraction({ aiProbability: 0.1, price: 0.5 }) === 0, "negative edge -> zero Kelly");

console.log("estimateSlippage:");
assert(estimateSlippage(10, 5000) > 0, "order vs liquidity produces slippage");
assert(estimateSlippage(10, undefined) === 0, "unknown liquidity -> zero slippage");
assert(estimateSlippage(100000, 1000) <= 0.05, "slippage capped at 5%");

console.log("computeOpportunity:");
const opp = computeOpportunity({
  market,
  analysis: {
    estimated_probability_yes: 0.65, estimated_probability_no: 0.35, market_probability: 0.5,
    estimated_edge: 0.15, confidence_score: 80, recommended_action: "YES",
    reasoning: "r", supporting_evidence: [], risk_factors: [], analysis_timestamp: "",
  },
  settings,
});
assert(opp.outcome === "YES", "positive edge -> YES outcome");
assert(Math.abs(opp.edge_pp - 15) < 0.01, "edge is 15pp");
assert(opp.passes_min_edge, "15pp edge passes 8pp minimum");
assert(opp.recommended_size <= settings.max_position_size, "size capped at max position");
assert(opp.expected_value_per_mana > 0, "positive EV for favorable trade");

console.log("checkRisk:");
const ok = checkRisk(settings, { balance: 1000, portfolioValue: 1000, openPositions: 2, dailyAllocated: 10, dailyRealizedLoss: 0, marketLiquidity: 5000, marketResolved: false, minutesToClose: 600 }, 20);
assert(ok.passed, "healthy context passes");
const stop = checkRisk({ ...settings, emergency_stop: true }, { balance: 1000, portfolioValue: 1000, openPositions: 0, dailyAllocated: 0, dailyRealizedLoss: 0, marketLiquidity: 5000, marketResolved: false, minutesToClose: 600 }, 20);
assert(!stop.passed && stop.failedChecks.some((c) => c.includes("emergency stop")), "emergency stop blocks trading");
const illiquid = checkRisk(settings, { balance: 1000, portfolioValue: 1000, openPositions: 0, dailyAllocated: 0, dailyRealizedLoss: 0, marketLiquidity: 100, marketResolved: false, minutesToClose: 600 }, 20);
assert(!illiquid.passed, "illiquid market rejected");
const dailyLoss = checkRisk(settings, { balance: 1000, portfolioValue: 1000, openPositions: 0, dailyAllocated: 0, dailyRealizedLoss: -60, marketLiquidity: 5000, marketResolved: false, minutesToClose: 600 }, 20);
assert(!dailyLoss.passed && dailyLoss.failedChecks.some((c) => c.includes("daily loss")), "daily loss threshold halts trading");
const tooBig = checkRisk(settings, { balance: 100, portfolioValue: 100, openPositions: 0, dailyAllocated: 0, dailyRealizedLoss: 0, marketLiquidity: 5000, marketResolved: false, minutesToClose: 600 }, 50);
assert(!tooBig.passed, "size above balance rejected");

console.log("decideTrade:");
const d1 = decideTrade({ market, edgePp: 15, settings: { ...settings, automation_enabled: true }, balance: 1000, openPositions: 1, dailyAllocated: 0, kellySize: 25 });
assert(d1.action === "BUY_YES" && d1.size >= 10 && d1.size <= 30, "valid edge executes YES with sane size");
const d2 = decideTrade({ market, edgePp: 3, settings: { ...settings, automation_enabled: true }, balance: 1000, openPositions: 1, dailyAllocated: 0, kellySize: 25 });
assert(d2.action === "SKIP", "edge below minimum skipped");
const d3 = decideTrade({ market, edgePp: 15, settings: { ...settings, automation_enabled: true, mode: "ANALYSIS_ONLY" }, balance: 1000, openPositions: 1, dailyAllocated: 0, kellySize: 25 });
assert(d3.action === "SKIP", "ANALYSIS_ONLY mode never trades");

if (failures > 0) {
  console.error(`\n${failures} test(s) FAILED`);
  process.exit(1);
}
console.log("\nAll engine tests passed");
