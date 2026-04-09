import type { PlannerPreferences } from "./weeklyPlanner";
import { DEFAULT_PLANNER_PREFERENCES } from "./weeklyPlanner";
import type {
  BreakfastPreferenceKey,
  CookingSkillLevel,
  CookingTimeKey,
  DietaryFilterKey,
  MealStructureKey,
  PlannerMealType,
} from "./plannerConstants";

export type UserPreferencesRow = {
  user_id: string;
  cooking_time_preference: string;
  cooking_skill_level?: string | null;
  custom_goal?: string | null;
  household_size: number;
  adults_count: number;
  children_count: number;
  planning_days: number;
  meal_types: string[];
  meal_structure: string;
  objectives: string[];
  dietary_filters: string[];
  world_cuisines: string[];
  seasonal_preference: boolean;
  breakfast_preference?: string | null;
};

function isCookingTimeKey(s: string): s is CookingTimeKey {
  return ["moins_15", "15_30", "30_45", "45_plus"].includes(s);
}

function isMealStructureKey(s: string): s is MealStructureKey {
  return ["entree_plat_dessert", "entree_plat", "plat_dessert", "plat_seul"].includes(s);
}

const MEAL_TYPES: PlannerMealType[] = ["breakfast", "lunch", "dinner", "snack"];

function isPlannerMealType(s: string): s is PlannerMealType {
  return (MEAL_TYPES as string[]).includes(s);
}

const DIETARY_KEYS = new Set<string>([
  "vegetarien",
  "vegan",
  "pescetarien",
  "flexitarien",
  "sans_gluten",
  "sans_lactose",
  "sans_porc",
  "sans_fruits_coque",
  "sans_arachides",
  "sans_oeufs",
  "sans_soja",
  "sans_poisson",
  "sans_crustaces",
]);

function isDietaryFilterKey(s: string): s is DietaryFilterKey {
  return DIETARY_KEYS.has(s);
}

function isCookingSkillLevel(s: string): s is CookingSkillLevel {
  return s === "debutant" || s === "intermediaire" || s === "confirme";
}

export function rowToPlannerPreferences(
  row: UserPreferencesRow,
  equipment: { equipment_key: string }[],
  allergies: { allergy_key: string }[],
  excluded: { ingredient_name: string }[]
): PlannerPreferences {
  const cooking = isCookingTimeKey(row.cooking_time_preference)
    ? row.cooking_time_preference
    : DEFAULT_PLANNER_PREFERENCES.cooking_time_preference;

  const meal_types = (row.meal_types || [])
    .filter(isPlannerMealType) as PlannerMealType[];
  const dietary_filters = (row.dietary_filters || [])
    .filter(isDietaryFilterKey) as DietaryFilterKey[];

  const meal_structure = isMealStructureKey(row.meal_structure)
    ? row.meal_structure
    : DEFAULT_PLANNER_PREFERENCES.meal_structure;

  const cooking_skill_level =
    row.cooking_skill_level && isCookingSkillLevel(row.cooking_skill_level)
      ? row.cooking_skill_level
      : DEFAULT_PLANNER_PREFERENCES.cooking_skill_level;

  const custom_goal =
    typeof row.custom_goal === "string" && row.custom_goal.trim()
      ? row.custom_goal.trim().slice(0, 150)
      : null;

  let objectivesOut =
    Array.isArray(row.objectives) && row.objectives.length
      ? [...row.objectives]
      : [...DEFAULT_PLANNER_PREFERENCES.objectives];
  if (custom_goal && !objectivesOut.includes("autre")) {
    objectivesOut = ["autre"];
  }

  const eqKeys = equipment.map((e) => e.equipment_key);

  const bpRaw = row.breakfast_preference;
  const breakfast_preference: BreakfastPreferenceKey =
    bpRaw === "sweet" || bpRaw === "savory" || bpRaw === "both"
      ? bpRaw
      : DEFAULT_PLANNER_PREFERENCES.breakfast_preference;

  return {
    cooking_time_preference: cooking,
    cooking_skill_level,
    household_size: Math.max(1, row.household_size || 1),
    adults_count: Math.max(0, row.adults_count ?? 1),
    children_count: Math.max(0, row.children_count ?? 0),
    planning_days: Math.min(14, Math.max(1, row.planning_days || 7)),
    meal_types: meal_types.length ? meal_types : DEFAULT_PLANNER_PREFERENCES.meal_types,
    meal_structure,
    objectives: objectivesOut,
    custom_goal,
    dietary_filters,
    world_cuisines: Array.isArray(row.world_cuisines) ? row.world_cuisines : [],
    seasonal_preference: Boolean(row.seasonal_preference),
    breakfast_preference,
    equipment_keys: eqKeys.length ? eqKeys : DEFAULT_PLANNER_PREFERENCES.equipment_keys,
    allergy_keys: allergies.map((a) => a.allergy_key),
    excluded_ingredients: excluded.map((x) => x.ingredient_name),
  };
}
