import "server-only";
import { runScanCycle, evaluateOpenPositions } from "./trading-engine";
import { getSupabase } from "./supabase";
import { DEFAULT_SETTINGS } from "./engine";
import type { BotSettings } from "./types";

const DEMO_USER = "00000000-0000-0000-0000-000000000001";

let timer: NodeJS.Timeout | null = null;
let lastRun: string | null = null;
let running = false;

async function currentIntervalMinutes(): Promise<number> {
  try {
    const { data } = await getSupabase()
      .from("bot_settings")
      .select("scan_interval_minutes, automation_enabled, emergency_stop")
      .eq("user_id", DEMO_USER)
      .maybeSingle();
    const s = data as Partial<BotSettings> | null;
    return s?.scan_interval_minutes ?? DEFAULT_SETTINGS.scan_interval_minutes;
  } catch {
    return DEFAULT_SETTINGS.scan_interval_minutes;
  }
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await runScanCycle();
    await evaluateOpenPositions();
    lastRun = result.cycle;
    try {
      await getSupabase().from("agent_logs").insert({
        level: result.errors.length > 0 ? "warn" : "info",
        event: "scan_cycle",
        details: { mode: result.mode, scanned: result.scanned, analyzed: result.analyzed, decisions: result.decisions.length, errors: result.errors },
      });
    } catch (logErr) {
      console.error("[scheduler] agent log insert failed:", logErr);
    }
  } catch (err) {
    console.error("[scheduler] cycle failed:", err);
  } finally {
    running = false;
  }
}

export function startScheduler() {
  if (timer || typeof window !== "undefined") return;
  const loop = async () => {
    const minutes = await currentIntervalMinutes();
    await tick();
    timer = setTimeout(loop, Math.max(1, minutes) * 60_000);
  };
  timer = setTimeout(loop, 5_000);
  console.log("[scheduler] started (server-side, survives dashboard closure)");
}

export function stopScheduler() {
  if (timer) clearTimeout(timer);
  timer = null;
}

export function schedulerStatus() {
  return { running: timer !== null, lastRun, currentlyRunning: running };
}
