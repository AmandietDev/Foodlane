/**
 * Cache serveur partagé pour les recettes.
 *
 * Un seul cache pour toutes les routes API — évite que chaque route recharge
 * depuis Supabase indépendamment. TTL plus long (30 min) car les recettes
 * changent rarement.
 *
 * ⚠️ À importer uniquement dans du code serveur (routes API, Server Components).
 */
import type { Recipe } from "./recipes";

let cache: { at: number; data: Recipe[] } | null = null;
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function getCachedRecipes(): Promise<Recipe[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.data;

  // Import dynamique pour éviter les dépendances circulaires côté client
  const { fetchRecipes } = await import("./recipes");
  const data = await fetchRecipes();
  cache = { at: now, data };
  return data;
}

/** Force un rechargement au prochain appel (utile après une modification de recette). */
export function invalidateRecipesCache(): void {
  cache = null;
}
