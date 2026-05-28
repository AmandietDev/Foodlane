import type { Recipe } from "./recipes";

let cache: { at: number; data: Recipe[] } | null = null;
let fetchPromise: Promise<Recipe[]> | null = null;
const TTL_MS = 30 * 60 * 1000;

export async function getCachedRecipes(): Promise<Recipe[]> {
  if (process.env.DISABLE_RECIPE_SERVER_CACHE === "true") {
    const { fetchRecipes } = await import("./recipes");
    return fetchRecipes();
  }

  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    console.log(`[RecipesCache] HIT ${cache.data.length} recettes (age ${Math.round((now - cache.at) / 1000)}s)`);
    return cache.data;
  }

  // Verrou : évite plusieurs chargements simultanés sur cache froid
  if (!fetchPromise) {
    const t0 = Date.now();
    fetchPromise = (async () => {
      const { fetchRecipes } = await import("./recipes");
      const data = await fetchRecipes();
      cache = { at: Date.now(), data };
      fetchPromise = null;
      console.log(`[RecipesCache] MISS → ${data.length} recettes en ${Date.now() - t0}ms`);
      return data;
    })();
  } else {
    console.log("[RecipesCache] MISS (en attente du chargement en cours)");
  }

  return fetchPromise;
}

export function invalidateRecipesCache(): void {
  cache = null;
  fetchPromise = null;
}
