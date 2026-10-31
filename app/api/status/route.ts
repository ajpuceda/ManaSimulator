import { json } from "@/lib/api-helpers";
import { statusPayload } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(statusPayload());
}
