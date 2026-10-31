import { NextRequest } from "next/server";
import { json, handleError } from "@/lib/api-helpers";
import { getMarket } from "@/lib/manifold";
import { analyzeMarket } from "@/lib/mistral";
import { computeEdge } from "@/lib/engine";
import { getSupabase } from "@/lib/supabase";
import type { AiAnalysis } from "@/lib/types";

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
    });
    const analysis: Omit<AiAnalysis, "id" | "created_at"> & { market_id: string } = {
      market_id: market.id,
      market_probability: market.probability,
      ai_probability: result.ai_probability,
      edge: computeEdge(market, { ...result } as AiAnalysis),
      confidence: result.confidence,
      expected_value: result.expected_value,
      risk_factors: result.risk_factors,
      evidence: result.evidence,
      recommendation: result.recommendation,
      reasoning: result.reasoning,
    };
    try {
      const { data, error } = await getSupabase()
        .from("ai_analyses")
        .insert(analysis)
        .select()
        .single();
      if (error) console.error("[supabase] ai_analyses insert failed:", error.message);
      return json({ analysis: data ?? { ...analysis, id: "local", created_at: new Date().toISOString() } });
    } catch (dbErr) {
      console.error("[supabase] unavailable, returning ephemeral analysis:", dbErr);
      return json({
        analysis: { ...analysis, id: "local", created_at: new Date().toISOString() },
        persisted: false,
      });
    }
  } catch (err) {
    return handleError(err);
  }
}
