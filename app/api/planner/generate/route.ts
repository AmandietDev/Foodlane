import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { fetchRecipes } from "../../../src/lib/recipes";
import {
  buildWeeklyPlan,
  buildExclusionList,
  filterRecipesByStrictExclusions,
  mergePlannerPreferences,
  scoreRecipeForPlanner,
  type PlannerGenerateInput,
  type LockedSlot,
} from "../../../src/lib/weeklyPlanner";
import { DEFAULT_PLANNER_PREFERENCES } from "../../../src/lib/weeklyPlanner";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../src/lib/plannerServer";
import type { PlannerPreferences } from "../../../src/lib/weeklyPlanner";
import { persistWeeklyPlanToSupabase } from "../../../src/lib/plannerPersistence";
import { buildWeeklyPlanWithAi } from "../../../src/lib/weeklyMenuAi";
import type { Locale } from "../../../src/lib/i18n";
import { filterRecipesByStructuredDietaryRules } from "../../../src/lib/dietaryStructured";
import { filterRecipesForSeasonalPool, getCurrentSeason } from "../../../src/lib/seasonalFilter";
import { repairPlanQuality } from "../../../src/lib/qualityControl";
import { applyBatchCooking, isBatchCookingEnabled } from "../../../src/lib/batchCooking";
import type { Recipe } from "../../../src/lib/recipes";
import { FREE_MENU_GENERATIONS_PER_MONTH } from "../../../src/lib/freemiumLimits";
import { monthPeriodKey, tryConsumeFreemiumQuota } from "../../../src/lib/usageQuotasServer";

const AI_LOCALES: Locale[] = ["fr", "en", "es", "de"];

function parseAiLocale(x: unknown): Locale {
  return typeof x === "string" && AI_LOCALES.includes(x as Locale) ? (x as Locale) : "fr";
}

export const dynamic = "force-dynamic";

let recipesCache: { at: number; data: Awaited<ReturnType<typeof fetchRecipes>> } | null = null;
const RECIPES_TTL_MS = 5 * 60 * 1000;
const FALLBACK_RECIPE_IMAGE_URL = "/menu-generation-collage.png";
const AI_MENU_TIMEOUT_MS = 24000;

type PlanRecipe = {
  id: number;
  nom_recette?: string;
  type?: string;
  difficulte?: string;
  temps_preparation_min?: number;
  categorie_temps?: string | null;
  description?: string;
  description_courte?: string;
  calories?: number;
  ingredients?: string;
  instructions?: string;
  equipements?: string;
  nombre_personnes?: number;
  image_url?: string | null;
  created_at?: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

function sanitizePlanRecipes(
  plan: NonNullable<Awaited<ReturnType<typeof buildWeeklyPlanWithAi>>> | ReturnType<typeof buildWeeklyPlan>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (plan as any).days = plan.days.map((day) => ({
    ...day,
    meals: day.meals.map((meal) => {
      const payload = (meal.recipe_payload || {}) as PlanRecipe;
      const safeName = (payload.nom_recette || meal.recipe_name || "").trim() || "Recette Foodlane";
      return {
        ...meal,
        recipe_name: (meal.recipe_name || "").trim() || safeName,
        recipe_payload: {
          ...payload,
          nom_recette: safeName,
          image_url: (payload.image_url || "").trim() || FALLBACK_RECIPE_IMAGE_URL,
        },
      };
    }),
  }));
}

function mondayISO(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré (Supabase admin)" }, { status: 503 });
  }

  const menuQuota = await tryConsumeFreemiumQuota(
    userId,
    "menu_generation",
    monthPeriodKey(),
    FREE_MENU_GENERATIONS_PER_MONTH
  );
  if (!menuQuota.allowed) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        metric: "menu_generation",
        limit: menuQuota.limit,
        count: menuQuota.count,
        message: "Tu as atteint la limite de générations de menu pour ce mois sur le plan gratuit.",
      },
      { status: 403 }
    );
  }

  let body: {
    week_start_date?: string;
    overrides?: PlannerGenerateInput;
    use_ai_menu?: boolean;
    locale?: string;
    locked_slots?: LockedSlot[];
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const aiLocale = parseAiLocale(body.locale);

  const weekStart = body.week_start_date || mondayISO();

  const { data: row } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let basePrefs: PlannerPreferences = DEFAULT_PLANNER_PREFERENCES;

  if (row) {
    const [{ data: equipment }, { data: allergies }, { data: excluded }] = await Promise.all([
      supabaseAdmin.from("user_equipment").select("equipment_key").eq("user_id", userId),
      supabaseAdmin.from("user_allergies").select("allergy_key").eq("user_id", userId),
      supabaseAdmin.from("user_excluded_ingredients").select("ingredient_name").eq("user_id", userId),
    ]);
    basePrefs = rowToPlannerPreferences(
      row as UserPreferencesRow,
      equipment || [],
      allergies || [],
      excluded || []
    );
  }

  const merged = mergePlannerPreferences(basePrefs, body.overrides || {});

  // Récupérer les recettes non aimées par l'utilisateur
  const { data: dislikedRows } = await supabaseAdmin
    .from("user_disliked_recipes")
    .select("recipe_id")
    .eq("user_id", userId);
  const dislikedIds = new Set<number>((dislikedRows || []).map((r) => Number(r.recipe_id)));

  const now = Date.now();
  let allRecipes =
    recipesCache && now - recipesCache.at < RECIPES_TTL_MS
      ? recipesCache.data
      : await fetchRecipes().then((data) => {
          recipesCache = { at: now, data };
          return data;
        });

  // Exclure les recettes non aimées
  const recipes = dislikedIds.size > 0
    ? allRecipes.filter((r) => !dislikedIds.has(r.id))
    : allRecipes;

  // Charger les recipe_id des 6 derniers menus pour pénaliser les répétitions
  const recentlyUsed = new Map<number, number>();
  if (supabaseAdmin) {
    const { data: recentMenus } = await supabaseAdmin
      .from("weekly_menus")
      .select("id, weekly_menu_days(weekly_menu_meals(recipe_id))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);

    if (recentMenus) {
      type MealRow = { recipe_id: number | string };
      type DayRow = { weekly_menu_meals: MealRow[] };
      recentMenus.forEach((menu, menuIdx) => {
        const days = (menu.weekly_menu_days as DayRow[]) || [];
        for (const day of days) {
          for (const meal of (day.weekly_menu_meals || [])) {
            const rid = Number(meal.recipe_id);
            if (Number.isFinite(rid) && !recentlyUsed.has(rid)) {
              recentlyUsed.set(rid, menuIdx); // 0 = menu le plus récent
            }
          }
        }
      });
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const recentFamilyCounts = new Map<string, number>();
  if (supabaseAdmin) {
    const { data: featureRows } = await supabaseAdmin
      .from("user_menu_feature_history")
      .select("family_counts")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);
    for (const row of featureRows || []) {
      const raw = (row as { family_counts?: Record<string, unknown> }).family_counts || {};
      for (const [k, v] of Object.entries(raw)) {
        const n = Number(v) || 0;
        if (n <= 0) continue;
        recentFamilyCounts.set(k, (recentFamilyCounts.get(k) || 0) + n);
      }
    }
  }
  const lockedSlots: LockedSlot[] = Array.isArray(body.locked_slots) ? body.locked_slots : [];

  const shouldUseAi = Boolean(openaiKey);
  const aiPlan = shouldUseAi
    ? await withTimeout(
        buildWeeklyPlanWithAi(
          recipes,
          merged,
          weekStart,
          openaiKey as string,
          aiLocale,
          recentlyUsed,
          recentFamilyCounts,
          lockedSlots
        ),
        AI_MENU_TIMEOUT_MS
      )
    : null;
  const rawPlan =
    aiPlan ?? buildWeeklyPlan(recipes, merged, weekStart, recentlyUsed, recentFamilyCounts, lockedSlots);

  // ── Contrôle qualité post-génération ────────────────────────────────────
  // On reconstruit un pool scoré minimal pour pouvoir REMPLACER les recettes
  // qui font sauter un cap (protéine, féculent, dish_type, family).
  // C'est le filet de sécurité final : même si l'IA ou le greedy laisse passer
  // une répétition, le repair tente de l'absorber.
  const season = getCurrentSeason();
  let qualityPool: Recipe[] = filterRecipesByStructuredDietaryRules(
    recipes,
    merged.dietary_filters,
    merged.allergy_keys
  );
  qualityPool = filterRecipesByStrictExclusions(qualityPool, buildExclusionList(merged));
  // Pas de filtre équipement strict (voir commentaire dans buildWeeklyPlan)
  if (merged.seasonal_preference) {
    qualityPool = filterRecipesForSeasonalPool(qualityPool, season);
  }
  const scoredPool = qualityPool
    .map((r) => ({
      r,
      s: scoreRecipeForPlanner(r, season, merged, recentFamilyCounts),
    }))
    .sort((a, b) => b.s - a.s);

  // Contrôle qualité : les incompatibilités créneau sont corrigées SANS limite,
  // les sur-représentations dans la limite de 8 remplacements.
  const repaired = repairPlanQuality(rawPlan, merged, scoredPool, { maxReplacements: 8 });
  const plan = repaired.plan;
  sanitizePlanRecipes(plan);

  // ── Batch cooking ───────────────────────────────────────────────────────
  // Si l'utilisateur a coché l'objectif "batch", on détecte les recettes
  // batchables (gâteaux, granolas, soupes, mijotés, etc.) et on les réplique
  // sur les jours suivants pour éviter la sur-cuisine.
  let batchInfo: { batches_created: number; meals_replaced: number } = {
    batches_created: 0,
    meals_replaced: 0,
  };
  if (isBatchCookingEnabled(merged.objectives)) {
    batchInfo = applyBatchCooking(plan, {
      householdSize: merged.household_size,
      lockedSlots,
    });
  }

  const title = `Menu semaine du ${weekStart}`;

  const persisted = await persistWeeklyPlanToSupabase(supabaseAdmin, {
    userId,
    weekStart,
    title,
    merged,
    plan,
    generationContextExtra: {
      ai_menu: shouldUseAi,
      quality_repair: {
        replacements: repaired.replacements,
        problems_before: repaired.report_before.problems.length,
        problems_after: repaired.report_after.problems.length,
        unique_recipes_before: repaired.report_before.unique_recipes,
        unique_recipes_after: repaired.report_after.unique_recipes,
        protein_counts_after: repaired.report_after.protein_counts,
        carb_counts_after: repaired.report_after.carb_counts,
        dish_counts_after: repaired.report_after.dish_counts,
      },
      batch_cooking: {
        enabled: isBatchCookingEnabled(merged.objectives),
        batches_created: batchInfo.batches_created,
        meals_replaced: batchInfo.meals_replaced,
      },
    },
  });

  if ("error" in persisted) {
    return NextResponse.json({ error: persisted.error }, { status: 500 });
  }

  const { menuId, listId, grocery_count } = persisted;

  return NextResponse.json({
    menu_id: menuId,
    grocery_list_id: listId,
    plan,
    grocery_count,
    used_ai_menu: shouldUseAi,
  });
}
