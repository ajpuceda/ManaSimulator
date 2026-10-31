import { NextRequest } from "next/server";
import { json, handleError, statusPayload } from "@/lib/api-helpers";
import { runScanCycle } from "@/lib/trading-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const services = statusPayload();
    if (services.missing.length > 0) {
      return json({ error: "Missing configuration", missing: services.missing }, 503);
    }
    void req;
    const result = await runScanCycle();
    return json(result);
  } catch (err) {
    return handleError(err);
  }
}
