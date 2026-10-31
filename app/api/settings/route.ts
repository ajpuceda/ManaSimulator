import { NextRequest } from "next/server";
import { json, handleError, statusPayload } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_SETTINGS } from "@/lib/engine";
import type { BotSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEMO_USER = "00000000-0000-0000-0000-000000000001";

const NUMERIC_FIELDS = [
  "max_position_size",
  "max_daily_allocation_pct",
  "min_edge_pct",
  "max_open_positions",
  "scan_interval_minutes",
] as const;

export async function GET() {
  try {
    const services = statusPayload();
    if (!services.services.supabase) {
      return json({ settings: { ...DEFAULT_SETTINGS, user_id: DEMO_USER, updated_at: new Date().toISOString() }, ...services });
    }
    try {
      const { data, error } = await getSupabase()
        .from("bot_settings")
        .select("*")
        .eq("user_id", DEMO_USER)
        .maybeSingle();
      if (error) throw error;
      return json({
        settings: (data as BotSettings | null) ?? { ...DEFAULT_SETTINGS, user_id: DEMO_USER, updated_at: new Date().toISOString() },
        ...services,
      });
    } catch (err) {
      return handleError(err);
    }
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const services = statusPayload();
    if (!services.services.supabase) {
      return json({ error: "Supabase is not configured; settings cannot be persisted." }, 503);
    }
    const body = (await req.json()) as Partial<BotSettings>;
    const update: Record<string, unknown> = { user_id: DEMO_USER, updated_at: new Date().toISOString() };
    for (const f of NUMERIC_FIELDS) {
      if (body[f] !== undefined) update[f] = Number(body[f]);
    }
    if (body.automation_enabled !== undefined) update.automation_enabled = Boolean(body.automation_enabled);
    update.dry_run = true;
    const { data, error } = await getSupabase()
      .from("bot_settings")
      .upsert(update, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return json({ settings: data as BotSettings, ...services });
  } catch (err) {
    return handleError(err);
  }
}
