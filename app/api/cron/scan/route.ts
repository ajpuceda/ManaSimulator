import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runScanCycle, evaluateOpenPositions } from "@/lib/trading-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = env.cronSecret;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await runScanCycle();
    const monitor = await evaluateOpenPositions();
    return NextResponse.json({ ok: true, result, monitor });
  } catch (err) {
    console.error("[cron] scan failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
