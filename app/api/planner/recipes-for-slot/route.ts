import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getCachedRecipes } from "../../../src/lib/recipesServerCache";
import {
  buildExclusionList,
  filterRecipesByStrictExclusions,
  DEFAULT_PLANNER_PREFERENCES,
  scoreRecipeForPlanner,
} from "../../../src/lib/weeklyPlanner";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../src/lib/plannerServer";
import { filterRecipesForSeasonalPool, getCurrentSeason } from "../../../src/lib/seasonalFilter";
import { filterRecipesByStructuredDietaryRules } from "../../../src/lib/dietaryStructured";
import { isRecipeCompatibleWithMealType } from "../../../src/lib/mealCompatibility";
import type { PlannerMealType } from "../../../src/lib/plannerConstants";
import type { Recipe } from "../../../src/lib/recipes";

export const dynamic = "force-dynamic";


const MAX_RESULTS = 60;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * GET /api/planner/recipes-for-slot?meal_type=breakfast&query=avocat
 *
 * Retourne jusqu'a 60 recettes compatibles avec le type de repas demande,
 * filtrees par les preferences utilisateur (regime, allergies, exclusions,
 * saison) et triees par pertinence. Optionnellement filtrees par recherche
 * textuelle sur le nom de recette.
 *
 * Utilise par la modal "Choisir une recette" dans le Planifier.
 */
export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const mealType = (params.get("meal_type") || "").trim() as PlannerMealType;
  const query = (params.get("query") || "").trim();
  const excludeIdsRaw = params.get("exclude_ids") || "";
  const excludeIds = new Set<number>(
    excludeIdsRaw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter(Number.isFinite)
  );

  if (!mealType) {
    return NextResponse.json({ error: "meal_type requis" }, { status: 400 });
  }

  const [
    { data: prefRow },
    { data: equipData },
    { data: allergyData },
    { data: excludedData },
    { data: dislikedRows },
    allRecipes,
  ] = await Promise.all([
    supabaseAdmin.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("user_equipment").select("equipment_key").eq("user_id", userId),
    supabaseAdmin.from("user_allergies").select("allergy_key").eq("user_id", userId),
    supabaseAdmin.from("user_excluded_ingredients").select("ingredient_name").eq("user_id", userId),
    supabaseAdmin.from("user_disliked_recipes").select("recipe_id").eq("user_id", userId),
    getCachedRecipes(),
  ]);

  let prefs = DEFAULT_PLANNER_PREFERENCES;
  if (prefRow) {
    prefs = rowToPlannerPreferences(prefRow as UserPreferencesRow, equipData || [], allergyData || [], excludedData || []);
  }

  const dislikedIds = new Set<number>((dislikedRows || []).map((r) => Number(r.recipe_id)));

  const season = getCurrentSeason();
  const exclusions = buildExclusionList(prefs);

  // Filtres durs
  let pool = allRecipes.filter(
    (r) => !dislikedIds.has(r.id) && !excludeIds.has(r.id)
  );
  pool = filterRecipesByStructuredDietaryRules(
    pool,
    prefs.dietary_filters,
    prefs.allergy_keys
  );
  pool = filterRecipesByStrictExclusions(pool, exclusions);

  // Compatibilite type de repas (filtre dur absolu)
  pool = pool.filter((r) => isRecipeCompatibleWithMealType(r, mealType));

  // Saison : on prefere la saison mais on garde tout si vide
  if (prefs.seasonal_preference) {
    const seasonalPool = filterRecipesForSeasonalPool(pool, season);
    if (seasonalPool.length >= 20) {
      pool = seasonalPool;
    }
  }

  // Recherche textuelle (sur le nom de recette)
  if (query) {
    const q = normalize(query);
    pool = pool.filter((r) =>
      normalize(r.nom_recette || "").includes(q)
    );
  }

  if (pool.length === 0) {
    return NextResponse.json({ recipes: [], total: 0 });
  }

  // Tri par score pertinence
  const scored = pool
    .map((r) => ({ r, s: scoreRecipeForPlanner(r, season, prefs) }))
    .sort((a, b) => b.s - a.s);

  const recipes = scored.slice(0, MAX_RESULTS).map(({ r }) => ({
    id: r.id,
    nom_recette: r.nom_recette,
    type: r.type,
    difficulte: r.difficulte,
    temps_preparation_min: r.temps_preparation_min,
    calories: r.calories ?? r.calories_par_portion ?? null,
    ingredients: r.ingredients ?? r.ingredients_quantites ?? null,
    image_url: r.image_url,
    dish_type: r.dish_type,
    nombre_personnes: r.nombre_personnes,
  }));

  return NextResponse.json({
    recipes,
    total: scored.length,
    truncated: scored.length > MAX_RESULTS,
  });
}
