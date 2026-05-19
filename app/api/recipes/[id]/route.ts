import { NextResponse } from "next/server";
import { fetchRecipeByIdFromSupabase } from "../../../src/lib/recipes-supabase";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Identifiant recette invalide." }, { status: 400 });
  }

  try {
    const recipe = await fetchRecipeByIdFromSupabase(id);
    if (!recipe) {
      return NextResponse.json({ error: "Recette introuvable." }, { status: 404 });
    }
    return NextResponse.json(
      { recipe },
      {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (e) {
    console.error("[API recipes/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
