import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getBalance } from "@/lib/manifold";
import type { Analytics, Trade, Position } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let balance = 0;
    try {
      balance = (await getBalance()).balance;
    } catch {
      balance = 0;
    }
    const supabase = getSupabase();
    const [tradesRes, positionsRes, analysesRes] = await Promise.all([
      supabase.from("trades").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("positions").select("*"),
      supabase.from("ai_analyses").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    const trades = (tradesRes.data ?? []) as Trade[];
    const positions = (positionsRes.data ?? []) as Position[];
    const analyses = analysesRes.data ?? [];

    const now = Date.now();
    const dayMs = 86_400_000;
    const plOf = (t: Trade) => 0;
    const realizedByDay = new Map<number, number>();
    for (const t of trades) {
      const day = Math.floor(new Date(t.created_at).getTime() / dayMs);
      realizedByDay.set(day, (realizedByDay.get(day) ?? 0) + plOf(t));
    }
    const dailyReturn = balance > 0 ? 0 : 0;
    const sellTrades = trades.filter((t) => t.type.includes("SELL"));
    const wins = sellTrades.length;
    const closedPos = positions.filter((p) => p.status === "closed" && p.realized_pl !== 0);
    const profits = closedPos.filter((p) => p.realized_pl > 0).map((p) => p.realized_pl);
    const losses = closedPos.filter((p) => p.realized_pl < 0).map((p) => p.realized_pl);

    let peak = balance;
    let maxDrawdown = 0;
    for (const p of positions) {
      const v = balance + p.unrealized_pl;
      peak = Math.max(peak, v);
      maxDrawdown = Math.max(maxDrawdown, peak - v);
    }

    const resolved = analyses.filter((a) => {
      const m = a as unknown as { resolved?: boolean };
      return m.resolved === true;
    });

    const analytics: Analytics = {
      total_return: positions.reduce((s, p) => s + p.realized_pl + p.unrealized_pl, 0),
      daily_return: dailyReturn,
      weekly_return: 0,
      monthly_return: 0,
      win_rate: closedPos.length === 0 ? 0 : (profits.length / closedPos.length) * 100,
      avg_profit_per_trade: profits.length ? profits.reduce((a, b) => a + b, 0) / profits.length : 0,
      avg_loss_per_trade: losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
      max_drawdown: maxDrawdown,
      total_trades: trades.length,
      ai_accuracy: null,
    };
    return NextResponse.json({ analytics, balance, open_positions: positions.filter((p) => p.status === "open").length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
