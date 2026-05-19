import { NextRequest, NextResponse } from "next/server";
import { fetchRecipes } from "../../../src/lib/recipes";
import { isRecipeCompatibleWithMealType } from "../../../src/lib/mealCompatibility";
import { getMealSlots, getMainProtein, getDishType } from "../../../src/lib/recipeFields";
import type { PlannerMealType } from "../../../src/lib/plannerConstants";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../src/lib/plannerServer";
import {
  DEFAULT_PLANNER_PREFERENCES,
  buildExclusionList,
  expandEquipmentKeys,
  filterRecipesByStrictExclusions,
} from "../../../src/lib/weeklyPlanner";
import { filterRecipesByEquipment } from "../../../src/lib/dietaryProfiles";
import { filterRecipesByStructuredDietaryRules } from "../../../src/lib/dietaryStructured";
import { filterRecipesForSeasonalPool, getCurrentSeason } from "../../../src/lib/seasonalFilter";
import type { Recipe } from "../../../src/lib/recipes";

export const dynamic = "force-dynamic";

/**
 * Endpoint de diagnostic enrichi.
 *
 * Si un utilisateur est connecté, simule la chaîne complète de filtres avec
 * SES préférences réelles, et retourne la taille du pool après CHAQUE étape,
 * GLOBALEMENT et PAR CRÉNEAU. Permet d'identifier exactement quel filtre
 * réduit drastiquement les recettes disponibles pour breakfast/snack.
 *
 * URL : /api/planner/debug-pool
 */
export async function GET(request: NextRequest) {
  const all = await fetchRecipes();
  const meals: PlannerMealType[] = ["breakfast", "lunch", "dinner", "snack"];
  const userId = await getUserIdFromRequest(request);

  const countByMeal = (pool: Recipe[]) => {
    const out: Record<string, number> = {};
    for (const m of meals) {
      out[m] = pool.filter((r) => isRecipeCompatibleWithMealType(r, m)).length;
    }
    return out;
  };

  const result: Record<string, unknown> = {
    total_recipes: all.length,
    recipes_with_meal_slot: all.filter((r) => (r.meal_slot || "").trim().length > 0).length,
    recipes_with_dish_type: all.filter((r) => (r.dish_type || "").trim().length > 0).length,
    recipes_with_main_protein: all.filter((r) => (r.main_protein || "").trim().length > 0).length,
    recipes_with_diet_tags: all.filter((r) => (r.diet_tags || "").trim().length > 0).length,
    base_compatible_per_meal: countByMeal(all),
  };

  // Simulation avec préférences utilisateur réelles
  if (userId && supabaseAdmin) {
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
      prefs = rowToPlannerPreferences(
        row as UserPreferencesRow,
        equipment || [],
        allergies || [],
        excluded || []
      );
    }

    const season = getCurrentSeason();
    const exclusions = buildExclusionList(prefs);
    const equipStrings = expandEquipmentKeys(prefs.equipment_keys);

    // Étape 1 : filtre diététique structuré (diet_tags / allergens / main_protein)
    const afterStructured = filterRecipesByStructuredDietaryRules(
      all,
      prefs.dietary_filters,
      prefs.allergy_keys
    );

    // Étape 2 : exclusions regex sur ingredients (legacy)
    const afterExclusions = filterRecipesByStrictExclusions(afterStructured, exclusions);

    // Étape 3 : équipement
    const afterEquipment =
      equipStrings.length > 0
        ? filterRecipesByEquipment(afterExclusions, equipStrings)
        : afterExclusions;

    // Étape 4 : saisonnier (si activé)
    const afterSeasonal = prefs.seasonal_preference
      ? filterRecipesForSeasonalPool(afterEquipment, season)
      : afterEquipment;

    // Étape 5 : recentlyUsed (recettes dans les 6 derniers menus)
    const recentIds = new Set<number>();
    const { data: recentMenus } = await supabaseAdmin
      .from("weekly_menus")
      .select("id, weekly_menu_days(weekly_menu_meals(recipe_id))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);
    type MealRow = { recipe_id: number | string };
    type DayRow = { weekly_menu_meals: MealRow[] };
    for (const menu of recentMenus || []) {
      const days = (menu.weekly_menu_days as DayRow[]) || [];
      for (const day of days) {
        for (const meal of day.weekly_menu_meals || []) {
          const rid = Number(meal.recipe_id);
          if (Number.isFinite(rid)) recentIds.add(rid);
        }
      }
    }
    const afterRecent = afterSeasonal.filter((r) => !recentIds.has(r.id));

    // Étape 6 : disliked
    const { data: dislikedRows } = await supabaseAdmin
      .from("user_disliked_recipes")
      .select("recipe_id")
      .eq("user_id", userId);
    const dislikedIds = new Set<number>((dislikedRows || []).map((r) => Number(r.recipe_id)));
    const afterDisliked = afterRecent.filter((r) => !dislikedIds.has(r.id));

    result.user_preferences = {
      dietary_filters: prefs.dietary_filters,
      allergy_keys: prefs.allergy_keys,
      excluded_ingredients: prefs.excluded_ingredients,
      equipment_keys: prefs.equipment_keys,
      seasonal_preference: prefs.seasonal_preference,
      season,
      planning_days: prefs.planning_days,
      meal_types: prefs.meal_types,
    };
    result.pool_funnel = {
      step_0_total: { total: all.length, per_meal: countByMeal(all) },
      step_1_after_dietary_structured: {
        total: afterStructured.length,
        per_meal: countByMeal(afterStructured),
      },
      step_2_after_exclusions_regex: {
        total: afterExclusions.length,
        per_meal: countByMeal(afterExclusions),
      },
      step_3_after_equipment: {
        total: afterEquipment.length,
        per_meal: countByMeal(afterEquipment),
      },
      step_4_after_seasonal: {
        total: afterSeasonal.length,
        per_meal: countByMeal(afterSeasonal),
      },
      step_5_after_recently_used: {
        total: afterRecent.length,
        per_meal: countByMeal(afterRecent),
        recent_ids_count: recentIds.size,
      },
      step_6_after_disliked: {
        total: afterDisliked.length,
        per_meal: countByMeal(afterDisliked),
        disliked_count: dislikedIds.size,
      },
    };
  } else {
    result.note =
      "Connecte-toi pour obtenir la simulation avec tes préférences réelles (filtre saisonnier, régime, recettes récentes, etc.).";
  }

  // Détail par créneau (sans filtres utilisateur)
  const bySlot: Record<string, unknown> = {};
  for (const meal of meals) {
    const compatible = all.filter((r) => isRecipeCompatibleWithMealType(r, meal));
    bySlot[meal] = {
      compatible_count: compatible.length,
      sample: compatible.slice(0, 5).map((r) => ({
        id: r.id,
        nom_recette: r.nom_recette,
        meal_slot: r.meal_slot || null,
        dish_type: r.dish_type || null,
        main_protein: getMainProtein(r) || null,
        saison: r.saison || null,
      })),
    };
  }
  result.by_slot = bySlot;

  const slotValues = new Map<string, number>();
  for (const r of all) {
    for (const s of getMealSlots(r)) {
      slotValues.set(s, (slotValues.get(s) || 0) + 1);
    }
  }
  result.distinct_meal_slot_values = Object.fromEntries(
    [...slotValues.entries()].sort((a, b) => b[1] - a[1])
  );

  const dishValues = new Map<string, number>();
  for (const r of all) {
    const d = getDishType(r);
    if (!d) continue;
    dishValues.set(d, (dishValues.get(d) || 0) + 1);
  }
  result.distinct_dish_type_values = Object.fromEntries(
    [...dishValues.entries()].sort((a, b) => b[1] - a[1])
  );

  return NextResponse.json(result);
}
