import { NextRequest, NextResponse } from "next/server";
import { fetchRecipesFromSheet } from "../../src/lib/recipes";

import {
  ingredientTermsMatchAll,
  normalizeIngredientSearch,
  recipeSearchBlob,
  scoreRecipeByTerms,
} from "../../src/lib/ingredientSearchMatch";

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

// Maximum recipes fetched from DB when terms are present (for relevance ranking)
const MAX_SEARCH_FETCH = 500;

function sanitizeTerm(s: string): string {
  return s.replace(/[,()'"]/g, " ").trim().slice(0, 100);
}

function normalizeStr(s: string): string {
  return normalizeIngredientSearch(s);
}

/**
 * GET /api/recipes?page=1&limit=24&type=sweet&query=pomme,cannelle
 *
 * With query terms: fetches up to 500 matching recipes (ANY term),
 * ranks by relevance (title > description > ingredients), returns sorted page.
 *
 * Without query terms: standard paginated query ordered by id.
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

      if (terms.length > 0) {
        // ANY-term OR filter — broad match; we rank by relevance in JS below
        const anyFilter = terms
          .flatMap((t) => [
            `nom_recette.ilike.%${t}%`,
            `ingredients_quantites.ilike.%${t}%`,
            `ingredients.ilike.%${t}%`,
            `description_courte.ilike.%${t}%`,
          ])
          .join(",");
        q = q.or(anyFilter);

        const { data, error } = await q.range(0, MAX_SEARCH_FETCH - 1);
        if (error) throw error;

        // Rank by relevance: more matches + better positions = higher score
        const ranked = (data as Record<string, unknown>[])
          .filter((r) => ingredientTermsMatchAll(recipeSearchBlob(r), terms))
          .map((r) => ({ r, score: scoreRecipeByTerms(r, terms) }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score);

        const slice = ranked.slice(offset, offset + limit);
        const recipes = slice.map(({ r }) => ({
          ...r,
          calories: (r.calories_par_portion ?? r.calories) as number | null,
          created_at: (r.created_at as string) ?? new Date().toISOString(),
        }));

        return NextResponse.json(
          { recipes, hasMore: ranked.length > offset + limit, page, limit },
          { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
        );
      }

      // No search terms: standard paginated query ordered by id
      const { data, error } = await q
        .order("id", { ascending: true })
        .range(offset, offset + limit - 1);
      if (error) throw error;

      const recipes = (data as Record<string, unknown>[]).map((r) => ({
        ...r,
        calories: (r.calories_par_portion ?? r.calories) as number | null,
        created_at: (r.created_at as string) ?? new Date().toISOString(),
      }));

      return NextResponse.json(
        { recipes, hasMore: recipes.length === limit, page, limit },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" } }
      );
    } catch (err) {
      console.error("[API /recipes] Supabase error:", err);
    }
  }

  // CSV fallback — scoring and filtering done in JS
  try {
    let all = await fetchRecipesFromSheet();

    if (typeParam === "sweet")
      all = all.filter((r) => normalizeStr(r.type || "").includes("sucr"));
    else if (typeParam === "savory")
      all = all.filter((r) => normalizeStr(r.type || "").includes("sal"));

    if (terms.length > 0) {
      const scored = all
        .filter((r) => ingredientTermsMatchAll(recipeSearchBlob(r as unknown as Record<string, unknown>), terms))
        .map((r) => ({
          r,
          score: scoreRecipeByTerms(r as unknown as Record<string, unknown>, terms),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);
      const slice = scored.slice(offset, offset + limit).map(({ r }) => r);
      return NextResponse.json(
        { recipes: slice, hasMore: scored.length > offset + limit, page, limit },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

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
