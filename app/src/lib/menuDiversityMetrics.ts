import type { PlannedWeek } from "./weeklyPlanner";
import type { Recipe } from "./recipes";
import { recipeDiversityTags } from "./recipeDiversity";

export type MenuDiversityMetrics = {
  total_slots: number;
  unique_recipe_count: number;
  duplicate_count: number;
  unique_ratio: number;
  family_counts: Record<string, number>;
  diversity_tags_counts: Record<string, number>;
  top_diversity_tags: string[];
};

export function computeMenuDiversityMetrics(plan: PlannedWeek): MenuDiversityMetrics {
  const recipeIds: number[] = [];
  const familyCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      recipeIds.push(meal.recipe_id);
      const r = meal.recipe_payload as Recipe;
      const family = (r.family || r.meal_subtype || "autre").toString().trim().toLowerCase();
      familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
      for (const t of recipeDiversityTags(r)) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }
  }

  const totalSlots = recipeIds.length;
  const uniqueCount = new Set(recipeIds).size;
  const duplicateCount = Math.max(0, totalSlots - uniqueCount);
  const uniqueRatio = totalSlots > 0 ? uniqueCount / totalSlots : 1;
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  return {
    total_slots: totalSlots,
    unique_recipe_count: uniqueCount,
    duplicate_count: duplicateCount,
    unique_ratio: Number(uniqueRatio.toFixed(4)),
    family_counts: Object.fromEntries(familyCounts),
    diversity_tags_counts: Object.fromEntries(tagCounts),
    top_diversity_tags: topTags,
  };
}
