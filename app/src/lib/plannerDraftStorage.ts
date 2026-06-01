import { getCurrentSeason } from "./seasonalFilter";
import type { PlannedMeal, PlannedWeek } from "./weeklyPlanner";

const STORAGE_KEY = "foodlane-planifier-draft";

export type PlanifierDraft = {
  plan: PlannedWeek;
  menuId: string;
  weekStart: string;
  lockedSlots: string[];
};

export function planifierEditHref(menuId: string | null | undefined): string {
  if (menuId) return `/planifier?menu=${encodeURIComponent(menuId)}`;
  return "/planifier";
}

export function savePlanifierDraft(draft: PlanifierDraft): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function loadPlanifierDraft(): PlanifierDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlanifierDraft;
    if (!parsed?.plan?.days || !parsed.menuId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPlanifierDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Reconstruit un plan éditable depuis GET /api/planner/menus/[id]. */
export function plannedWeekFromMenuApi(json: {
  menu?: { generation_context?: { meta?: PlannedWeek["meta"] } };
  days?: Array<{
    day_index: number;
    day_date: string;
    meals: Array<{
      meal_type: string;
      recipe_id: number | string;
      recipe_name?: string;
      recipe_payload?: PlannedMeal["recipe_payload"];
      batch_group_id?: string | null;
      is_batch_origin?: boolean | null;
      batch_servings?: number | null;
    }>;
  }>;
}): PlannedWeek | null {
  if (!json.days?.length) return null;
  const meta: PlannedWeek["meta"] = json.menu?.generation_context?.meta ?? {
    season: getCurrentSeason(),
    recipes_considered: 0,
    recipes_after_filters: 0,
  };
  return {
    days: json.days.map((d) => ({
      day_index: d.day_index,
      day_date: d.day_date,
      meals: d.meals.map((m) => ({
        meal_type: m.meal_type as PlannedMeal["meal_type"],
        recipe_id: Number(m.recipe_id),
        recipe_name: String(m.recipe_name || m.recipe_payload?.nom_recette || "Recette"),
        recipe_payload: (m.recipe_payload || { id: Number(m.recipe_id) }) as PlannedMeal["recipe_payload"],
        batch_group_id: m.batch_group_id ?? null,
        is_batch_origin: m.is_batch_origin ?? null,
        batch_servings: m.batch_servings ?? null,
      })),
    })),
    meta,
  };
}
