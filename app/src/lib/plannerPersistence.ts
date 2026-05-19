import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildGroceryFromPlan,
  getEffectiveRecipePortions,
  type GroceryListItemDraft,
  type PlannedWeek,
  type PlannerPreferences,
} from "./weeklyPlanner";
import { computeMenuDiversityMetrics } from "./menuDiversityMetrics";

export async function persistWeeklyPlanToSupabase(
  admin: SupabaseClient,
  params: {
    userId: string;
    weekStart: string;
    title: string;
    merged: PlannerPreferences;
    plan: PlannedWeek;
    generationContextExtra?: Record<string, unknown>;
  }
): Promise<{ menuId: string; listId: string; grocery_count: number } | { error: string }> {
  const { userId, weekStart, title, merged, plan, generationContextExtra } = params;
  const diversity = computeMenuDiversityMetrics(plan);

  const { data: menuRow, error: menuErr } = await admin
    .from("weekly_menus")
    .insert({
      user_id: userId,
      title,
      week_start_date: weekStart,
      planning_days: merged.planning_days,
      generation_context: {
        preferences: merged,
        meta: plan.meta,
        diversity,
        ...generationContextExtra,
      },
    })
    .select("id")
    .single();

  if (menuErr || !menuRow) {
    console.error("[persistWeeklyPlan] menu", menuErr);
    return { error: menuErr?.message || "Erreur création menu" };
  }

  const menuId = menuRow.id as string;

  const allRecipeIds = plan.days.flatMap((d) => d.meals.map((m) => Number(m.recipe_id))).filter(Number.isFinite);
  const { error: featureHistoryErr } = await admin.from("user_menu_feature_history").insert({
    user_id: userId,
    weekly_menu_id: menuId,
    week_start_date: weekStart,
    recipe_ids: allRecipeIds,
    family_counts: diversity.family_counts,
    diversity_tags_counts: diversity.diversity_tags_counts,
    unique_ratio: diversity.unique_ratio,
  });
  if (featureHistoryErr) {
    console.warn("[persistWeeklyPlan] user_menu_feature_history", featureHistoryErr.message);
  }

  // Bulk-insert all days in a single call
  const daysPayload = plan.days.map((day) => ({
    weekly_menu_id: menuId,
    day_index: day.day_index,
    day_date: day.day_date,
  }));

  const { data: dayRows, error: daysErr } = await admin
    .from("weekly_menu_days")
    .insert(daysPayload)
    .select("id, day_index");

  if (daysErr || !dayRows?.length) {
    console.error("[persistWeeklyPlan] days", daysErr);
    return { error: daysErr?.message || "Erreur création jours" };
  }

  // Map day_index → DB row id
  const dayIdByIndex = new Map<number, string>(
    dayRows.map((r) => [r.day_index as number, r.id as string])
  );

  // Bulk-insert all meals in a single call
  const mealsPayload: Record<string, unknown>[] = [];
  for (const day of plan.days) {
    const dayId = dayIdByIndex.get(day.day_index);
    if (!dayId) continue;
    for (const meal of day.meals) {
      mealsPayload.push({
        weekly_menu_day_id: dayId,
        meal_type: meal.meal_type,
        recipe_id: meal.recipe_id,
        recipe_name: meal.recipe_name,
        recipe_payload: meal.recipe_payload as unknown as Record<string, unknown>,
        batch_group_id: meal.batch_group_id ?? null,
        is_batch_origin: meal.is_batch_origin ?? null,
        batch_servings: meal.batch_servings ?? null,
      });
    }
  }

  if (mealsPayload.length) {
    const { error: mealsErr } = await admin
      .from("weekly_menu_meals")
      .insert(mealsPayload);
    if (mealsErr) {
      console.error("[persistWeeklyPlan] meals", mealsErr);
    }
  }

  const { data: listRow, error: listErr } = await admin
    .from("grocery_lists")
    .insert({
      weekly_menu_id: menuId,
      user_id: userId,
      title: `Courses — ${title}`,
    })
    .select("id")
    .single();

  if (listErr || !listRow) {
    return { error: listErr?.message || "Erreur liste de courses" };
  }

  const listId = listRow.id as string;

  const portions = getEffectiveRecipePortions(merged);
  const groceryDraft: GroceryListItemDraft[] = buildGroceryFromPlan(plan, portions);

  if (groceryDraft.length) {
    const { error: itemsErr } = await admin.from("grocery_list_items").insert(
      groceryDraft.map((it) => ({
        grocery_list_id: listId,
        ingredient_name: it.ingredient_name,
        quantity: it.quantity,
        unit: it.unit,
        category: it.category,
        checked: false,
        source_recipe_ids: it.source_recipe_ids,
      }))
    );
    if (itemsErr) {
      console.error("[persistWeeklyPlan] items", itemsErr);
    }
  }

  return { menuId, listId, grocery_count: groceryDraft.length };
}
