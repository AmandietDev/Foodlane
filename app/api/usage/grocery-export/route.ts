import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { FREE_GROCERY_EXPORTS_PER_WEEK } from "../../../src/lib/freemiumLimits";
import { tryConsumeFreemiumQuota, weekPeriodKey } from "../../../src/lib/usageQuotasServer";

export const dynamic = "force-dynamic";

/**
 * Réserve une unité de quota d’export liste de courses (plan gratuit, par semaine).
 * Les exports réels restent côté client ; cet endpoint sert d’enforcement serveur.
 */
export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const q = await tryConsumeFreemiumQuota(
    userId,
    "grocery_export",
    weekPeriodKey(),
    FREE_GROCERY_EXPORTS_PER_WEEK
  );

  if (!q.allowed) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        metric: "grocery_export",
        limit: q.limit,
        count: q.count,
        message:
          "Tu as atteint la limite d’exports de liste de courses pour cette semaine sur le plan gratuit.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, limit: q.limit, count: q.count });
}
