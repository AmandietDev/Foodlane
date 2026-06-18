import type { Recipe } from "./recipes";
import { getCurrentSeason, scoreRecipeSeasonRelevance } from "./seasonalFilter";

const STORAGE_KEY = "foodlane_recent_home_recipes";
const MAX_RECENT = 48;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StoredRecent = { ids: number[]; at: number };

export function loadRecentHomeRecipeIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRecent;
    if (!parsed?.ids?.length || Date.now() - (parsed.at || 0) > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.ids.filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

export function rememberHomeRecipeIds(newIds: number[]): void {
  if (typeof window === "undefined" || newIds.length === 0) return;
  const prev = loadRecentHomeRecipeIds();
  const merged = [...newIds, ...prev.filter((id) => !newIds.includes(id))].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids: merged, at: Date.now() }));
  } catch {
    /* quota */
  }
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type ScorableRecipe = Recipe & {
  personalization_score?: number;
};

/**
 * Propositions aléatoires avec priorité saison + profil, sans ordre BDD.
 * Les recettes de saison remontent en tête du pool, puis tirage aléatoire
 * dans une bande large pour varier les suggestions.
 */
export function pickDisplayRecipes<T extends ScorableRecipe>(
  items: T[],
  limit: number,
  excludeIds: number[] = []
): T[] {
  if (items.length === 0) return [];

  const exclude = new Set(excludeIds);
  const season = getCurrentSeason();

  const scored = items
    .filter((item) => !exclude.has(item.id))
    .map((recipe) => {
      const seasonPts = scoreRecipeSeasonRelevance(recipe, season);
      const profilePts = (recipe.personalization_score ?? 0) * 0.4;
      const jitter = Math.random() * 18;
      return { recipe, score: seasonPts * 2.2 + profilePts + jitter };
    })
    .sort((a, b) => b.score - a.score);

  const bandSize = Math.max(limit * 6, 36);
  const band = scored.slice(0, Math.min(scored.length, bandSize));
  const shuffled = shuffleInPlace([...band]);

  const out: T[] = [];
  const used = new Set<number>();

  for (const row of shuffled) {
    if (used.has(row.recipe.id)) continue;
    used.add(row.recipe.id);
    out.push(row.recipe);
    if (out.length >= limit) break;
  }

  if (out.length < limit) {
    for (const row of scored) {
      if (used.has(row.recipe.id)) continue;
      used.add(row.recipe.id);
      out.push(row.recipe);
      if (out.length >= limit) break;
    }
  }

  return out;
}

/** @deprecated Utiliser pickDisplayRecipes */
export function rotateScoredRecipes<T extends { id: number }>(
  items: T[],
  limit: number,
  excludeIds: number[] = []
): T[] {
  return pickDisplayRecipes(items as ScorableRecipe[], limit, excludeIds) as T[];
}



