import type { Recipe } from "./recipes";
import { getImageUrl, getImageUrlAlternatives } from "./images";
import {
  filterRecipesBySeasonSmart,
  filterRecipesExcludeWrongSeason,
  getCurrentSeason,
} from "./seasonalFilter";

export type LandingRecipe = {
  id: number;
  nom_recette: string | null;
  temps_preparation_min: number | null;
  nombre_personnes: number | null;
  image_url: string;
};

const LANDING_RECIPE_COUNT = 12;
const MIN_SEASONAL_POOL = 6;

const INVALID_IMAGE_PLACEHOLDER = /^(n\/a|null|none|-|\.|—)$/i;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Recette avec une photo réellement affichable (pas seulement un champ rempli). */
export function recipeHasDisplayablePhoto(imageUrl: string | null | undefined): boolean {
  const raw = imageUrl?.trim();
  if (!raw || INVALID_IMAGE_PLACEHOLDER.test(raw)) return false;
  return getImageUrl(raw) !== null || getImageUrlAlternatives(raw).length > 0;
}

function hasPhoto(r: Recipe): boolean {
  return recipeHasDisplayablePhoto(r.image_url);
}

export function pickLandingRecipes(all: Recipe[]): LandingRecipe[] {
  const season = getCurrentSeason();

  let pool = all.filter((r) => r.nom_recette?.trim() && hasPhoto(r));
  pool = filterRecipesExcludeWrongSeason(pool, season);

  let candidates = filterRecipesBySeasonSmart(pool, season);
  if (candidates.length < MIN_SEASONAL_POOL) {
    candidates = pool;
  }

  return shuffle(candidates)
    .slice(0, LANDING_RECIPE_COUNT)
    .map((r) => ({
      id: r.id,
      nom_recette: r.nom_recette,
      temps_preparation_min: r.temps_preparation_min,
      nombre_personnes: r.nombre_personnes,
      image_url: r.image_url!.trim(),
    }));
}
