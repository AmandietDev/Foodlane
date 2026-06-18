import type { Recipe } from "./recipes";
import { rerankWithMMR } from "./mmrRanking";
import { scoreRecipeForPlanner, type PlannerPreferences } from "./weeklyPlanner";
import type { Season } from "./seasonalFilter";

const EXPLORATION_NOISE = 50;
const TOP_CANDIDATES = 18;

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function applyRecentlyUsedPenalty(
  score: number,
  recipeId: number,
  recentlyUsed?: Map<number, number>
): number {
  if (!recentlyUsed) return score;
  const menusAgo = recentlyUsed.get(recipeId);
  if (menusAgo === 0) return Math.max(0, score - 60);
  if (menusAgo === 1) return Math.max(0, score - 35);
  if (menusAgo === 2) return Math.max(0, score - 20);
  if (menusAgo === 3) return Math.max(0, score - 10);
  if (menusAgo === 4) return Math.max(0, score - 5);
  return score;
}

/**
 * Choisit une recette de remplacement en favorisant la diversité :
 * score + bruit aléatoire, MMR, puis tirage uniforme dans le top-K.
 */
export function pickRegenerationCandidate(
  pool: Recipe[],
  season: Season,
  prefs: PlannerPreferences,
  recentlyUsed?: Map<number, number>
): Recipe | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  const scoredRaw = pool
    .map((r) => ({
      r,
      s: applyRecentlyUsedPenalty(scoreRecipeForPlanner(r, season, prefs), r.id, recentlyUsed),
    }))
    .sort((a, b) => b.s - a.s);

  const scored = rerankWithMMR(scoredRaw, 0.72).map(({ r, s }) => ({
    r,
    s: s + Math.random() * EXPLORATION_NOISE,
  }));

  const top = scored.slice(0, Math.min(TOP_CANDIDATES, scored.length));
  return shuffleArray(top)[0]?.r ?? null;
}
