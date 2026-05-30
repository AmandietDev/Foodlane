import type { Recipe } from "./recipes";
import type { PlannerPreferences } from "./weeklyPlanner";
import {
  buildExclusionList,
  expandEquipmentKeys,
  filterRecipesByMaxPrepTime,
  filterRecipesByStrictExclusions,
  maxMinutesForCookingPreference,
  scoreRecipeForPlanner,
} from "./weeklyPlanner";
import { filterRecipesByEquipment } from "./dietaryProfiles";
import { filterRecipesByStructuredDietaryRules } from "./dietaryStructured";
import {
  filterRecipesBySeasonSmart,
  getCurrentSeason,
  scoreRecipeSeasonRelevance,
  type Season,
} from "./seasonalFilter";

export function filterRecipesForUserProfile(
  recipes: Recipe[],
  prefs: PlannerPreferences
): Recipe[] {
  const exclusions = buildExclusionList(prefs);
  let pool = filterRecipesByStructuredDietaryRules(recipes, prefs.dietary_filters, prefs.allergy_keys);
  pool = filterRecipesByStrictExclusions(pool, exclusions);
  pool = filterRecipesByMaxPrepTime(pool, maxMinutesForCookingPreference(prefs.cooking_time_preference));
  if (prefs.equipment_keys.length) {
    pool = filterRecipesByEquipment(pool, expandEquipmentKeys(prefs.equipment_keys));
  }
  const season = getCurrentSeason();
  if (prefs.seasonal_preference) {
    pool = filterRecipesBySeasonSmart(pool, season);
  }
  return pool;
}

export function scoreRecipesForDiscovery(
  recipes: Recipe[],
  prefs: PlannerPreferences,
  season: Season = getCurrentSeason()
): { recipe: Recipe; score: number }[] {
  return recipes
    .map((recipe) => ({
      recipe,
      score: scoreRecipeForPlanner(recipe, season, prefs),
    }))
    .sort((a, b) => b.score - a.score);
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Sélection aléatoire dans le haut du classement, en évitant les IDs récents. */
export function pickRotatedRecipes(
  scored: { recipe: Recipe; score: number }[],
  limit: number,
  excludeIds: number[] = []
): Recipe[] {
  const exclude = new Set(excludeIds);
  const eligible = scored.filter(({ recipe }) => !exclude.has(recipe.id));
  const bandSize = Math.max(limit * 5, 30);
  const band = eligible.slice(0, Math.min(eligible.length, bandSize));
  const shuffled = shuffleInPlace([...band]);
  const out: Recipe[] = [];
  const used = new Set<number>();

  for (const row of shuffled.sort((a, b) => b.score - a.score + Math.random() * 40)) {
    if (used.has(row.recipe.id)) continue;
    used.add(row.recipe.id);
    out.push(row.recipe);
    if (out.length >= limit) break;
  }

  if (out.length < limit) {
    for (const row of eligible) {
      if (used.has(row.recipe.id)) continue;
      used.add(row.recipe.id);
      out.push(row.recipe);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Recettes du moment : saison → popularité → diversité aléatoire. */
export function pickSeasonalHighlights(
  pool: Recipe[],
  prefs: PlannerPreferences,
  limit: number,
  popularity: Map<number, number>,
  excludeIds: number[] = []
): Recipe[] {
  const season = getCurrentSeason();
  const exclude = new Set(excludeIds);
  const scored = pool
    .filter((r) => !exclude.has(r.id))
    .map((recipe) => {
      const seasonPts = scoreRecipeSeasonRelevance(recipe, season);
      const profilePts = scoreRecipeForPlanner(recipe, season, prefs) * 0.25;
      const popPts = Math.min(25, (popularity.get(recipe.id) || 0) * 2);
      return { recipe, score: seasonPts * 2 + profilePts + popPts };
    })
    .sort((a, b) => b.score - a.score);

  return pickRotatedRecipes(scored, limit, excludeIds);
}

type PopularityCache = { at: number; map: Map<number, number> };
let popularityCache: PopularityCache | null = null;
const POPULARITY_TTL_MS = 60 * 60 * 1000;

export async function loadRecipePopularity(
  fetchFavorites: () => Promise<{ recipe_id: string | number }[]>,
  fetchMenuMeals: () => Promise<{ recipe_id: string | number | null }[]>
): Promise<Map<number, number>> {
  if (popularityCache && Date.now() - popularityCache.at < POPULARITY_TTL_MS) {
    return popularityCache.map;
  }
  const map = new Map<number, number>();
  const [favs, meals] = await Promise.all([fetchFavorites(), fetchMenuMeals()]);
  for (const row of favs) {
    const id = Number(row.recipe_id);
    if (!Number.isFinite(id)) continue;
    map.set(id, (map.get(id) || 0) + 2);
  }
  for (const row of meals) {
    const id = Number(row.recipe_id);
    if (!Number.isFinite(id)) continue;
    map.set(id, (map.get(id) || 0) + 1);
  }
  popularityCache = { at: Date.now(), map };
  return map;
}
