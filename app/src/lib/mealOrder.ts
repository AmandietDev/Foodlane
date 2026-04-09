import type { PlannerMealType } from "./plannerConstants";

/** Ordre d’affichage et de génération : petit-déj → déjeuner → collation → dîner */
export const MEAL_DISPLAY_ORDER: readonly PlannerMealType[] = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
];

function orderIndex(mealType: string): number {
  const i = (MEAL_DISPLAY_ORDER as readonly string[]).indexOf(mealType);
  return i === -1 ? 100 : i;
}

/** Filtre et ordonne les types de repas selon les slots demandés par l’utilisateur */
export function sortMealTypesForDisplay(types: string[]): PlannerMealType[] {
  return MEAL_DISPLAY_ORDER.filter((t) => types.includes(t)) as PlannerMealType[];
}

/** Trie les repas d’une journée pour l’affichage */
export function sortMealsByDisplayOrder<T extends { meal_type: string }>(meals: T[]): T[] {
  return [...meals].sort((a, b) => orderIndex(a.meal_type) - orderIndex(b.meal_type));
}
