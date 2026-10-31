import { NextRequest } from "next/server";
import { json, handleError } from "@/lib/api-helpers";
import { listMarkets, searchMarkets } from "@/lib/manifold";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q");
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 100);
    const markets = q ? await searchMarkets(q, limit) : await listMarkets(limit);
    return json({ markets });
  } catch (err) {
    return handleError(err);
  }
}
