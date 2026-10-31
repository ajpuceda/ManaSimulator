import { json, handleError, statusPayload } from "@/lib/api-helpers";
import { getBalance } from "@/lib/manifold";
import { getSupabase } from "@/lib/supabase";
import type { DashboardStats, Position, Trade, BotSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/engine";

export const dynamic = "force-dynamic";

const DEMO_USER = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const services = statusPayload();
    let balance = 0;
    if (services.services.manifold) {
      try {
        balance = (await getBalance()).balance;
      } catch (err) {
        console.error("[dashboard] balance fetch failed:", err);
      }
    }

    let positions: Position[] = [];
    let trades: Trade[] = [];
    let settings: BotSettings | null = null;
    if (services.services.supabase) {
      try {
        const supabase = getSupabase();
        const [posRes, tradeRes, setRes] = await Promise.all([
          supabase.from("positions").select("*").eq("status", "open").order("opened_at", { ascending: false }),
          supabase.from("trades").select("*").order("created_at", { ascending: false }).limit(200),
          supabase.from("bot_settings").select("*").eq("user_id", DEMO_USER).maybeSingle(),
        ]);
        positions = (posRes.data ?? []) as Position[];
        trades = (tradeRes.data ?? []) as Trade[];
        settings = (setRes.data ?? null) as BotSettings | null;
      } catch (err) {
        console.error("[dashboard] supabase queries failed:", err);
      }
    }

    const cfg = settings ?? ({ ...DEFAULT_SETTINGS, user_id: DEMO_USER, updated_at: new Date().toISOString() } as BotSettings);
    const invested = positions.reduce((s, p) => s + p.mana_invested, 0);
    const unrealized = positions.reduce((s, p) => s + p.unrealized_pl, 0);
    const realized = positions.reduce((s, p) => s + p.realized_pl, 0);
    const portfolioValue = balance + unrealized;
    const totalPl = unrealized + realized;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyTrades = trades.filter((t) => new Date(t.created_at) >= todayStart);
    const dailyPl = dailyTrades.length > 0 ? totalPl - 0 : 0;
    const closedTrades = trades.filter((t) => t.type.includes("SELL"));
    const wins = closedTrades.length;
    const winRate = trades.length === 0 ? 0 : wins > 0 ? Math.min(100, (closedTrades.length / trades.length) * 100) : 0;

    const stats: DashboardStats = {
      total_balance: balance,
      portfolio_value: portfolioValue,
      total_pl: totalPl,
      daily_pl: dailyPl,
      roi_pct: balance + invested > 0 ? (totalPl / (balance + invested)) * 100 : 0,
      open_positions: positions.length,
      total_trades: trades.length,
      win_rate: winRate,
      agent_status: cfg.emergency_stop ? "stopped" : cfg.automation_enabled ? "scanning" : "idle",
    };

    return json({
      stats,
      positions,
      recentTrades: trades.slice(0, 20),
      settings: cfg,
      mode: cfg.mode,
      emergency_stop: cfg.emergency_stop ?? false,
      ...services,
    });
  } catch (err) {
    return handleError(err);
  }
}
