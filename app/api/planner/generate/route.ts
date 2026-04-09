import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { fetchRecipes } from "../../../src/lib/recipes";
import { buildWeeklyPlan, mergePlannerPreferences, type PlannerGenerateInput } from "../../../src/lib/weeklyPlanner";
import { DEFAULT_PLANNER_PREFERENCES } from "../../../src/lib/weeklyPlanner";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../src/lib/plannerServer";
import type { PlannerPreferences } from "../../../src/lib/weeklyPlanner";
import { persistWeeklyPlanToSupabase } from "../../../src/lib/plannerPersistence";
import { buildWeeklyPlanWithAi } from "../../../src/lib/weeklyMenuAi";

export const dynamic = "force-dynamic";

let recipesCache: { at: number; data: Awaited<ReturnType<typeof fetchRecipes>> } | null = null;
const RECIPES_TTL_MS = 5 * 60 * 1000;
const FALLBACK_RECIPE_IMAGE_URL = "/menu-generation-collage.png";
const AI_MENU_TIMEOUT_MS = 12000;

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

  let body: { week_start_date?: string; overrides?: PlannerGenerateInput; use_ai_menu?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

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

  const openaiKey = process.env.OPENAI_API_KEY;
  const shouldUseAi = Boolean(openaiKey);
  const aiPlan = shouldUseAi
    ? await withTimeout(buildWeeklyPlanWithAi(recipes, merged, weekStart, openaiKey as string), AI_MENU_TIMEOUT_MS)
    : null;
  const plan = aiPlan ?? buildWeeklyPlan(recipes, merged, weekStart);
  sanitizePlanRecipes(plan);

  const title = `Menu semaine du ${weekStart}`;

  const persisted = await persistWeeklyPlanToSupabase(supabaseAdmin, {
    userId,
    weekStart,
    title,
    merged,
    plan,
    generationContextExtra: {
      ai_menu: shouldUseAi,
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
