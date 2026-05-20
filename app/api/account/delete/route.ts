import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/account/delete
 * Supprime définitivement l'utilisateur authentifié (auth.users + données en cascade selon le schéma).
 */
export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[account/delete]", error);
    return NextResponse.json(
      { error: error.message || "Suppression impossible pour le moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
