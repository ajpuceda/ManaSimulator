import { NextRequest } from "next/server";
import { json, handleError, statusPayload } from "@/lib/api-helpers";
import { listMarkets } from "@/lib/manifold";
import { analyzeMarket } from "@/lib/mistral";
import { getBalance } from "@/lib/manifold";
import { decideTrade } from "@/lib/engine";
import { getSupabase } from "@/lib/supabase";
import type { BotSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/engine";

export const dynamic = "force-dynamic";

const DEMO_USER = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  try {
    const services = statusPayload();
    const missing = services.missing;
    if (missing.length > 0) {
      return json({ error: "Missing configuration", missing }, 503);
    }
    const limit = Number(new URL(req.url).searchParams.get("limit") ?? 25);
    const markets = await listMarkets(limit);

    let settings: BotSettings = { ...DEFAULT_SETTINGS, user_id: DEMO_USER, updated_at: new Date().toISOString() };
    let balance = 0;
    try {
      balance = (await getBalance()).balance;
      const { data } = await getSupabase()
        .from("bot_settings")
        .select("*")
        .eq("user_id", DEMO_USER)
        .maybeSingle();
      if (data) settings = data as BotSettings;
    } catch (err) {
      console.error("[scan] settings/balance fetch failed:", err);
    }

    const opportunities = [];
    for (const market of markets.slice(0, Math.min(limit, 15))) {
      try {
        const analysis = await analyzeMarket({
          question: market.question,
          description: market.description,
          marketProbability: market.probability,
        });
        const decision = decideTrade({
          market,
          analysis: { ...analysis, edge: 0 } as never,
          settings,
          balance,
          openPositions: 0,
          dailyAllocated: 0,
        });
        opportunities.push({
          market,
          ai_probability: analysis.ai_probability,
          edge: (analysis.ai_probability - market.probability) * 100,
          confidence: analysis.confidence,
          recommendation: analysis.recommendation,
          suggested: decision.action,
          size: decision.size,
        });
      } catch (err) {
        console.error(`[scan] analysis failed for market ${market.id}:`, err);
      }
    }
    opportunities.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
    return json({ scanned: markets.length, opportunities: opportunities.slice(0, 20), dry_run: true });
  } catch (err) {
    return handleError(err);
  }
}
