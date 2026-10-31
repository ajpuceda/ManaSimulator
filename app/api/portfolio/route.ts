import { json, handleError, statusPayload } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import type { Position, Trade } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const services = statusPayload();
    if (!services.services.supabase) return json({ positions: [], trades: [], ...services });
    try {
      const supabase = getSupabase();
      const [posRes, tradeRes] = await Promise.all([
        supabase.from("positions").select("*").order("opened_at", { ascending: false }),
        supabase.from("trades").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      return json({
        positions: (posRes.data ?? []) as Position[],
        trades: (tradeRes.data ?? []) as Trade[],
        ...services,
      });
    } catch (err) {
      return handleError(err);
    }
  } catch (err) {
    return handleError(err);
  }
}
