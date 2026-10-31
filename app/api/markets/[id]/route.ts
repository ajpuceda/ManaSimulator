import { NextRequest } from "next/server";
import { json, handleError } from "@/lib/api-helpers";
import { getMarket } from "@/lib/manifold";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const market = await getMarket(id);
    return json({ market });
  } catch (err) {
    return handleError(err);
  }
}
