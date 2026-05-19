import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "../../../../src/lib/supabaseServer";
import { supabaseAdmin } from "../../../../src/lib/supabaseAdmin";
import { fetchRecipes, type Recipe } from "../../../../src/lib/recipes";
import {
  buildExclusionList,
  filterRecipesByStrictExclusions,
  scoreRecipeForPlanner,
  DEFAULT_PLANNER_PREFERENCES,
} from "../../../../src/lib/weeklyPlanner";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../../src/lib/plannerServer";
import { filterRecipesForSeasonalPool, getCurrentSeason } from "../../../../src/lib/seasonalFilter";
import { isRecipeCompatibleWithMealType } from "../../../../src/lib/mealCompatibility";
import { rerankWithMMR } from "../../../../src/lib/mmrRanking";
import type { PlannerMealType } from "../../../../src/lib/plannerConstants";
import { FREE_SLOT_REGENERATIONS_PER_MONTH } from "../../../../src/lib/freemiumLimits";
import { monthPeriodKey, tryConsumeFreemiumQuota } from "../../../../src/lib/usageQuotasServer";

export const dynamic = "force-dynamic";

let recipesCache: { at: number; data: Recipe[] } | null = null;
const RECIPES_TTL_MS = 5 * 60 * 1000;

function pickWeightedRandom<T>(items: { item: T; weight: number }[]): T | null {
  const total = items.reduce((acc, cur) => acc + Math.max(0, cur.weight), 0);
  if (total <= 0) return items[0]?.item ?? null;
  let cursor = Math.random() * total;
  for (const it of items) {
    cursor -= Math.max(0, it.weight);
    if (cursor <= 0) return it.item;
  }
  return items[items.length - 1]?.item ?? null;
}

export async function POST(request: NextRequest) {
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

  const excludeIds = new Set<number>((body.exclude_recipe_ids || []).map(Number).filter(Number.isFinite));

  // Load user preferences
  const { data: row } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let prefs = DEFAULT_PLANNER_PREFERENCES;
  if (row) {
    const [{ data: equipment }, { data: allergies }, { data: excluded }] = await Promise.all([
      supabaseAdmin.from("user_equipment").select("equipment_key").eq("user_id", userId),
      supabaseAdmin.from("user_allergies").select("allergy_key").eq("user_id", userId),
      supabaseAdmin.from("user_excluded_ingredients").select("ingredient_name").eq("user_id", userId),
    ]);
    prefs = rowToPlannerPreferences(row as UserPreferencesRow, equipment || [], allergies || [], excluded || []);
  }

  // Fetch recipes (with cache)
  const now = Date.now();
  const allRecipes =
    recipesCache && now - recipesCache.at < RECIPES_TTL_MS
      ? recipesCache.data
      : await fetchRecipes().then((data) => {
          recipesCache = { at: now, data };
          return data;
        });

  // Disliked recipes
  const { data: dislikedRows } = await supabaseAdmin
    .from("user_disliked_recipes")
    .select("recipe_id")
    .eq("user_id", userId);
  const dislikedIds = new Set<number>((dislikedRows || []).map((r) => Number(r.recipe_id)));

  const season = getCurrentSeason();
  const exclusions = buildExclusionList(prefs);

  // Filtres durs : exclusions alimentaires uniquement. Le filtre équipement est
  // désormais désactivé (voir commentaire dans buildWeeklyPlan).
  let pool = allRecipes.filter((r) => !dislikedIds.has(r.id) && !excludeIds.has(r.id));
  pool = filterRecipesByStrictExclusions(pool, exclusions);
  if (prefs.seasonal_preference) {
    const seasonalPool = filterRecipesForSeasonalPool(pool, season);
    pool = seasonalPool.length > 0 ? seasonalPool : pool;
  }

  // Compatibilité type de repas (filtre dur)
  pool = pool.filter((r) => isRecipeCompatibleWithMealType(r, mealType));

  if (pool.length === 0) {
    // Fallback : ignorer la saison mais garder exclusions + type de repas
    pool = allRecipes.filter((r) => !dislikedIds.has(r.id) && !excludeIds.has(r.id));
    pool = filterRecipesByStrictExclusions(pool, exclusions);
    pool = pool.filter((r) => isRecipeCompatibleWithMealType(r, mealType));
  }

  if (pool.length === 0) {
    return NextResponse.json({ error: "Aucune recette disponible pour ce créneau" }, { status: 404 });
  }

  const scored = rerankWithMMR(
    pool.map((r) => ({ r, s: scoreRecipeForPlanner(r, season, prefs) })),
    0.72
  );

  const recipe = pickWeightedRandom(scored.map(({ r, s }) => ({ item: r, weight: Math.max(1, s) })));
  if (!recipe) {
    return NextResponse.json({ error: "Impossible de sélectionner une recette" }, { status: 500 });
  }

  return NextResponse.json({ recipe });
}
