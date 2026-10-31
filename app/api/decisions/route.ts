import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { DecisionLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("decision_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ decisions: (data ?? []) as DecisionLog[] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
