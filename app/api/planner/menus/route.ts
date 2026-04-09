import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const url = new URL(request.url);
  const savedOnly = url.searchParams.get("saved_only") === "1";

  let query = supabaseAdmin
    .from("weekly_menus")
    .select("id, title, week_start_date, planning_days, created_at, updated_at, saved_in_carnet")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (savedOnly) query = query.eq("saved_in_carnet", true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ menus: data || [] });
}
