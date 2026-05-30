import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { getCachedRecipes } from "../../../src/lib/recipesServerCache";
import { DEFAULT_PLANNER_PREFERENCES } from "../../../src/lib/weeklyPlanner";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../src/lib/plannerServer";
import type { PlannerPreferences } from "../../../src/lib/weeklyPlanner";
import {
  filterRecipesForUserProfile,
  loadRecipePopularity,
  pickRotatedRecipes,
  pickSeasonalHighlights,
  scoreRecipesForDiscovery,
} from "../../../src/lib/recipeDiscovery";

export const dynamic = "force-dynamic";

function parseExcludeIds(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const limit = Math.min(12, Math.max(4, Number(request.nextUrl.searchParams.get("limit")) || 6));
  const excludeIds = parseExcludeIds(request.nextUrl.searchParams.get("exclude"));

  const { data: row } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let prefs: PlannerPreferences = DEFAULT_PLANNER_PREFERENCES;
  if (row) {
    const [{ data: equipment }, { data: allergies }, { data: excluded }] = await Promise.all([
      supabaseAdmin.from("user_equipment").select("equipment_key").eq("user_id", userId),
      supabaseAdmin.from("user_allergies").select("allergy_key").eq("user_id", userId),
      supabaseAdmin.from("user_excluded_ingredients").select("ingredient_name").eq("user_id", userId),
    ]);
    prefs = rowToPlannerPreferences(
      row as UserPreferencesRow,
      equipment || [],
      allergies || [],
      excluded || []
    );
  }

  const recipes = await getCachedRecipes();
  const pool = filterRecipesForUserProfile(recipes, prefs);
  if (pool.length === 0) {
    return NextResponse.json({ suggestions: [], seasonal: [], count: 0 });
  }

  const scored = scoreRecipesForDiscovery(pool, prefs);
  const popularity = await loadRecipePopularity(
    async () => {
      const { data } = await supabaseAdmin!
        .from("user_favorites")
        .select("recipe_id")
        .limit(8000);
      return data || [];
    },
    async () => {
      const { data } = await supabaseAdmin!
        .from("weekly_menu_meals")
        .select("recipe_id")
        .limit(8000);
      return data || [];
    }
  );

  const suggestions = pickRotatedRecipes(scored, limit, excludeIds);
  const suggestionIds = new Set(suggestions.map((r) => r.id));
  const seasonal = pickSeasonalHighlights(
    pool,
    prefs,
    limit,
    popularity,
    [...excludeIds, ...suggestionIds]
  );

  return NextResponse.json({
    suggestions,
    seasonal,
    count: pool.length,
  });
}
