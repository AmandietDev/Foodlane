import { NextRequest, NextResponse } from "next/server";
import { fetchRecipesFromSheet } from "../../src/lib/recipes";

export const dynamic = "force-dynamic";

// Lightweight fields for the recipe list — no instructions, no equipements
const LIST_SELECT = [
  "id", "nom_recette", "type", "difficulte", "temps_preparation_min",
  "categorie_temps", "nombre_personnes", "description_courte",
  "image_url", "saison", "meal_slot",
  "calories", "calories_par_portion",
  "ingredients", "ingredients_quantites",
  "created_at",
].join(", ");

function sanitizeTerm(s: string): string {
  // Remove characters that could break the PostgREST filter string syntax
  return s.replace(/[,()'"]/g, " ").trim().slice(0, 100);
}

/**
 * GET /api/recipes?page=1&limit=24&type=sweet&query=poulet,tomate
 *
 * Returns a paginated, server-side filtered list of recipes.
 * Payload is lightweight (no instructions, no equipements).
 *
 * Query params:
 *   page    — 1-based page number (default: 1)
 *   limit   — recipes per page, max 48 (default: 24)
 *   type    — "sweet" | "savory" (default: both)
 *   query   — comma-separated ingredient/name terms, all must match (AND)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") || "1"));
  const limit = Math.min(48, Math.max(1, Number(params.get("limit") || "24")));
  const offset = (page - 1) * limit;
  const typeParam = (params.get("type") || "").trim();
  const queryRaw = (params.get("query") || "").trim();
  const terms = queryRaw
    ? queryRaw.split(",").map(sanitizeTerm).filter(Boolean)
    : [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const { supabase } = await import("../../src/lib/supabase");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase.from("recipes_v2").select(LIST_SELECT);

      if (typeParam === "sweet") q = q.ilike("type", "%sucr%");
      else if (typeParam === "savory") q = q.ilike("type", "%sal%");

      // Each term is ANDed: recipe must contain all terms (in any of the searched columns)
      for (const term of terms) {
        q = q.or(
          `nom_recette.ilike.%${term}%,ingredients_quantites.ilike.%${term}%,ingredients.ilike.%${term}%,description_courte.ilike.%${term}%`
        );
      }

      const { data, error } = await q
        .order("id", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const recipes = (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        calories: (r.calories_par_portion ?? r.calories) as number | null,
        created_at: (r.created_at as string) ?? new Date().toISOString(),
      }));

      return NextResponse.json(
        { recipes, hasMore: recipes.length === limit, page, limit },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
          },
        }
      );
    } catch (err) {
      console.error("[API /recipes] Supabase error:", err);
    }
  }

  // CSV fallback — slice for pagination
  try {
    const all = await fetchRecipesFromSheet();
    const slice = all.slice(offset, offset + limit);
    return NextResponse.json(
      { recipes: slice, hasMore: offset + limit < all.length, page, limit },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur lors de la récupération" },
      { status: 500 }
    );
  }
}
