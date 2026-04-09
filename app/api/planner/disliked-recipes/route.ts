import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";

export const dynamic = "force-dynamic";

/** GET : liste des recipe_id non aimés */
export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });

  const { data, error } = await supabaseAdmin
    .from("user_disliked_recipes")
    .select("recipe_id, recipe_name")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ disliked: data || [] });
}

/** POST : ajouter une recette non aimée */
export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });

  let body: { recipe_id: number; recipe_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  if (!body.recipe_id) return NextResponse.json({ error: "recipe_id requis" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("user_disliked_recipes")
    .upsert(
      { user_id: userId, recipe_id: body.recipe_id, recipe_name: body.recipe_name || null },
      { onConflict: "user_id,recipe_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE : retirer une recette des non-aimées */
export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });

  let body: { recipe_id: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("user_disliked_recipes")
    .delete()
    .eq("user_id", userId)
    .eq("recipe_id", body.recipe_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
