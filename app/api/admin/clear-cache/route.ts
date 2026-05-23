import { NextRequest, NextResponse } from "next/server";
import { invalidateRecipesCache } from "../../../src/lib/recipesServerCache";
import { clearForMeCache } from "../../recipes/for-me/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/clear-cache
 * Header: x-admin-secret: <ADMIN_CACHE_SECRET>
 *
 * Vide le cache serveur des recettes (30 min) et le cache "recettes pour moi"
 * par utilisateur (5 min). À appeler après un import CSV dans Supabase.
 *
 * Exemple curl :
 *   curl -X POST https://ton-app.vercel.app/api/admin/clear-cache \
 *        -H "x-admin-secret: ton_secret_ici"
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_CACHE_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "ADMIN_CACHE_SECRET non configuré" }, { status: 503 });
  }

  const provided = request.headers.get("x-admin-secret");
  if (!provided || provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  invalidateRecipesCache();
  clearForMeCache();

  return NextResponse.json({
    ok: true,
    message: "Cache recettes vidé. Les routes génération, remplacement et « pour moi » rechargeront depuis Supabase au prochain appel.",
    cleared: ["recipesServerCache", "forMeUserCache"],
  });
}
