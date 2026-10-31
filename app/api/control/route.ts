import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { normalizeMode } from "@/lib/engine";
import type { OperatingMode } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEMO_USER = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { action?: string; mode?: string; confirmLive?: boolean };
    const supabase = getSupabase();

    if (body.action === "emergency_stop") {
      await supabase.from("bot_settings").upsert({ user_id: DEMO_USER, emergency_stop: true, automation_enabled: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      await supabase.from("agent_logs").insert({ level: "warn", event: "emergency_stop", details: {} });
      return NextResponse.json({ ok: true, emergency_stop: true });
    }

    if (body.action === "resume") {
      await supabase.from("bot_settings").upsert({ user_id: DEMO_USER, emergency_stop: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      return NextResponse.json({ ok: true, emergency_stop: false });
    }

    if (body.action === "set_mode") {
      const mode = normalizeMode(body.mode);
      if (mode === "LIVE" && body.confirmLive !== true) {
        return NextResponse.json({ error: "LIVE mode requires explicit confirmLive=true acknowledgement" }, { status: 400 });
      }
      await supabase.from("bot_settings").upsert({
        user_id: DEMO_USER,
        mode,
        dry_run: mode !== "LIVE",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      await supabase.from("agent_logs").insert({ level: mode === "LIVE" ? "warn" : "info", event: "mode_change", details: { mode } });
      return NextResponse.json({ ok: true, mode });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[control] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data } = await getSupabase().from("bot_settings").select("mode, emergency_stop, automation_enabled").eq("user_id", DEMO_USER).maybeSingle();
    const mode: OperatingMode = normalizeMode((data as { mode?: string } | null)?.mode);
    return NextResponse.json({
      mode,
      emergency_stop: (data as { emergency_stop?: boolean } | null)?.emergency_stop ?? false,
      automation_enabled: (data as { automation_enabled?: boolean } | null)?.automation_enabled ?? false,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
