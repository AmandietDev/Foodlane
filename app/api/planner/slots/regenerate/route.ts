import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "../../../../src/lib/supabaseServer";
import { supabaseAdmin } from "../../../../src/lib/supabaseAdmin";
import { type Recipe } from "../../../../src/lib/recipes";
import { getCachedRecipes } from "../../../../src/lib/recipesServerCache";
import {
  buildExclusionList,
  filterRecipesByStrictExclusions,
  DEFAULT_PLANNER_PREFERENCES,
} from "../../../../src/lib/weeklyPlanner";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../../src/lib/plannerServer";
import { filterRecipesForSeasonalPool, getCurrentSeason } from "../../../../src/lib/seasonalFilter";
import { isRecipeCompatibleWithMealType } from "../../../../src/lib/mealCompatibility";
import type { PlannerMealType } from "../../../../src/lib/plannerConstants";
import { FREE_SLOT_REGENERATIONS_PER_MONTH } from "../../../../src/lib/freemiumLimits";
import { monthPeriodKey, tryConsumeFreemiumQuota } from "../../../../src/lib/usageQuotasServer";
import { pickRegenerationCandidate } from "../../../../src/lib/regenerateSlotPicker";

export const dynamic = "force-dynamic";

function buildRecentlyUsedMap(
  recentMenus: Array<{ weekly_menu_days?: unknown }> | null | undefined
): Map<number, number> {
  const recentlyUsed = new Map<number, number>();
  if (!recentMenus) return recentlyUsed;

  type MealRow = { recipe_id: number | string };
  type DayRow = { weekly_menu_meals: MealRow[] };

  recentMenus.forEach((menu, menuIdx) => {
    const days = (menu.weekly_menu_days as DayRow[]) || [];
    for (const day of days) {
      for (const meal of day.weekly_menu_meals || []) {
        const rid = Number(meal.recipe_id);
        if (Number.isFinite(rid) && !recentlyUsed.has(rid)) {
          recentlyUsed.set(rid, menuIdx);
        }
      }
    }
  });

  return recentlyUsed;
}

function buildCandidatePool(
  allRecipes: Recipe[],
  mealType: PlannerMealType,
  excludeIds: Set<number>,
  dislikedIds: Set<number>,
  exclusions: string[],
  seasonalPreference: boolean,
  season: ReturnType<typeof getCurrentSeason>
): Recipe[] {
  let pool = allRecipes.filter((r) => !dislikedIds.has(r.id) && !excludeIds.has(r.id));
  pool = filterRecipesByStrictExclusions(pool, exclusions);
  if (seasonalPreference) {
    const seasonalPool = filterRecipesForSeasonalPool(pool, season);
    pool = seasonalPool.length > 0 ? seasonalPool : pool;
  }
  pool = pool.filter((r) => isRecipeCompatibleWithMealType(r, mealType));

  if (pool.length === 0) {
    pool = allRecipes.filter((r) => !dislikedIds.has(r.id) && !excludeIds.has(r.id));
    pool = filterRecipesByStrictExclusions(pool, exclusions);
    pool = pool.filter((r) => isRecipeCompatibleWithMealType(r, mealType));
  }

  return pool;
}

export async function POST(request: NextRequest) {
  const _t0 = Date.now();
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const slotQuota = await tryConsumeFreemiumQuota(
    userId,
    "slot_regeneration",
    monthPeriodKey(),
    FREE_SLOT_REGENERATIONS_PER_MONTH
  );
  if (!slotQuota.allowed) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        metric: "slot_regeneration",
        limit: slotQuota.limit,
        count: slotQuota.count,
        message: "Tu as atteint la limite de régénérations de créneau pour ce mois sur le plan gratuit.",
      },
      { status: 403 }
    );
  }

  let body: {
    meal_type: string;
    exclude_recipe_ids?: number[];
    rejected_recipe_ids?: number[];
    week_start_date?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const mealType = body.meal_type as PlannerMealType;
  if (!mealType) {
    return NextResponse.json({ error: "meal_type requis" }, { status: 400 });
  }

  const excludeIds = new Set<number>(
    [...(body.exclude_recipe_ids || []), ...(body.rejected_recipe_ids || [])]
      .map(Number)
      .filter(Number.isFinite)
  );

  const [
    { data: prefRow },
    { data: equipData },
    { data: allergyData },
    { data: excludedData },
    { data: dislikedRows },
    { data: recentMenus },
    allRecipes,
  ] = await Promise.all([
    supabaseAdmin.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("user_equipment").select("equipment_key").eq("user_id", userId),
    supabaseAdmin.from("user_allergies").select("allergy_key").eq("user_id", userId),
    supabaseAdmin.from("user_excluded_ingredients").select("ingredient_name").eq("user_id", userId),
    supabaseAdmin.from("user_disliked_recipes").select("recipe_id").eq("user_id", userId),
    supabaseAdmin
      .from("weekly_menus")
      .select("id, weekly_menu_days(weekly_menu_meals(recipe_id))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    getCachedRecipes(),
  ]);

  let prefs = DEFAULT_PLANNER_PREFERENCES;
  if (prefRow) {
    prefs = rowToPlannerPreferences(prefRow as UserPreferencesRow, equipData || [], allergyData || [], excludedData || []);
  }

  const dislikedIds = new Set<number>((dislikedRows || []).map((r) => Number(r.recipe_id)));
  const season = getCurrentSeason();
  const exclusions = buildExclusionList(prefs);
  const recentlyUsed = buildRecentlyUsedMap(recentMenus);

  let pool = buildCandidatePool(
    allRecipes,
    mealType,
    excludeIds,
    dislikedIds,
    exclusions,
    prefs.seasonal_preference,
    season
  );

  // Si trop de recettes exclues (historique de régénération), on assouplit en
  // retirant seulement l'historique de refus — on garde les recettes du menu.
  if (pool.length === 0 && (body.rejected_recipe_ids?.length ?? 0) > 0) {
    const weekOnly = new Set<number>((body.exclude_recipe_ids || []).map(Number).filter(Number.isFinite));
    pool = buildCandidatePool(
      allRecipes,
      mealType,
      weekOnly,
      dislikedIds,
      exclusions,
      prefs.seasonal_preference,
      season
    );
  }

  if (pool.length === 0) {
    return NextResponse.json({ error: "Aucune recette disponible pour ce créneau" }, { status: 404 });
  }

  const recipe = pickRegenerationCandidate(pool, season, prefs, recentlyUsed);
  if (!recipe) {
    return NextResponse.json({ error: "Impossible de sélectionner une recette" }, { status: 500 });
  }

  console.log(
    `[regenerate] total ${Date.now() - _t0}ms | pool=${pool.length} excluded=${excludeIds.size}`
  );
  return NextResponse.json({ recipe });
}
