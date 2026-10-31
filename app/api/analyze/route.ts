import { NextRequest } from "next/server";
import { json, handleError } from "@/lib/api-helpers";
import { getMarket } from "@/lib/manifold";
import { analyzeMarket } from "@/lib/mistral";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { marketId?: string };
    if (!body.marketId) {
      return json({ error: "marketId is required" }, 400);
    }
    const market = await getMarket(body.marketId);
    const result = await analyzeMarket({
      question: market.question,
      description: market.description,
      marketProbability: market.probability,
      liquidity: market.liquidity,
      volume: market.volume,
      closeTime: market.closeTime,
    });
    const row = {
      market_id: market.id,
      market_probability: result.market_probability,
      ai_probability: result.estimated_probability_yes,
      edge: result.estimated_edge * 100,
      confidence: result.confidence_score,
      expected_value: result.estimated_edge,
      risk_factors: result.risk_factors,
      evidence: result.supporting_evidence,
      recommendation:
        result.recommended_action === "YES" ? "BUY_YES" :
        result.recommended_action === "NO" ? "BUY_NO" : "HOLD",
      reasoning: result.reasoning,
    };
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("ai_analyses").insert(row).select().single();
      if (error) console.error("[supabase] ai_analyses insert failed:", error.message);
      await supabase.from("ai_predictions").insert({
        market_id: market.id,
        estimated_probability_yes: result.estimated_probability_yes,
        confidence_score: result.confidence_score,
        market_probability_at_prediction: market.probability,
      });
      return json({ analysis: data ?? { ...row, id: "local", created_at: new Date().toISOString() } });
    } catch (dbErr) {
      console.error("[supabase] unavailable, returning ephemeral analysis:", dbErr);
      return json({ analysis: { ...row, id: "local", created_at: new Date().toISOString() }, persisted: false });
    }
  } catch (err) {
    return handleError(err);
  }
}
