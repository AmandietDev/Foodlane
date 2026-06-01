import type { Recipe } from "./recipes";
import type { WeeklyMenu } from "./weeklyMenu";

/** Recettes déjà présentes dans un menu local (évite de charger tout le catalogue). */
export function recipesFromWeeklyMenu(menu: WeeklyMenu | null): Recipe[] {
  if (!menu) return [];
  const byId = new Map<number, Recipe>();
  for (const day of menu.days) {
    for (const meal of Object.values(day.meals)) {
      if (!meal?.recipes?.length) continue;
      for (const r of meal.recipes) {
        if (r?.id) byId.set(r.id, r);
      }
    }
  }
  return [...byId.values()];
}
