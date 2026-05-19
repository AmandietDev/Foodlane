/**
 * Normalisation et lecture robuste des champs `recipes_v2`.
 *
 * Beaucoup de colonnes contiennent plusieurs valeurs séparées par |, virgule,
 * point-virgule, espace ou underscore. Ce module centralise :
 *   - la normalisation texte (lowercase, sans accents, espaces uniformes)
 *   - le parsing multi-valeurs
 *   - la lecture défensive (fallback vers anciens noms de colonnes)
 *
 * Toute la logique de filtrage / scoring / diversité du moteur de menus
 * doit passer par ces helpers (jamais de regex maison ailleurs).
 */
import type { Recipe } from "./recipes";

/** Normalise une chaîne : lowercase, sans accents, espaces compressés. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse une chaîne multi-valeurs et retourne les tokens normalisés (uniques).
 *
 * Accepte n'importe quel séparateur courant : | , ; / et underscore.
 * Préserve les espaces internes (ex. "pois chiche" reste un seul token).
 *
 * Exemples :
 *   "petit_dejeuner|dejeuner"       → ["petit dejeuner", "dejeuner"]
 *   "vegetarien, sans_gluten"       → ["vegetarien", "sans gluten"]
 *   "Poulet ; Boeuf"                → ["poulet", "boeuf"]
 *   null / undefined / ""           → []
 */
export function parseMultiValue(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const cleaned = raw
    .toString()
    .replace(/['\u2019]/g, " ")
    .replace(/[|,;/]+/g, "|")
    .replace(/_/g, " ");
  const parts = cleaned
    .split("|")
    .map((p) => normalizeText(p))
    .filter((p) => p.length > 0);
  return [...new Set(parts)];
}

/**
 * Vérifie si un token cible est présent dans une chaîne multi-valeurs.
 * Comparaison robuste : accents/casse/séparateurs ignorés.
 */
export function multiValueIncludes(
  raw: string | null | undefined,
  needle: string
): boolean {
  const target = normalizeText(needle);
  if (!target) return false;
  const tokens = parseMultiValue(raw);
  return tokens.includes(target);
}

/**
 * Vérifie si AU MOINS UN des tokens cibles est présent dans une chaîne multi-valeurs.
 */
export function multiValueIncludesAny(
  raw: string | null | undefined,
  needles: string[]
): boolean {
  if (needles.length === 0) return false;
  const tokens = new Set(parseMultiValue(raw));
  if (tokens.size === 0) return false;
  return needles.some((n) => {
    const t = normalizeText(n);
    return t.length > 0 && tokens.has(t);
  });
}

// --------------------------------------------------------------------------
// Lecture défensive des champs recipe (avec fallback vers anciens noms)
// --------------------------------------------------------------------------

/** Retourne la chaîne meal_slot brute (ex. "petit_dejeuner|brunch"). */
export function getMealSlotRaw(recipe: Recipe): string | null {
  return recipe.meal_slot ?? null;
}

/** Retourne la liste normalisée des meal_slots d'une recette. */
export function getMealSlots(recipe: Recipe): string[] {
  return parseMultiValue(recipe.meal_slot);
}

/** Retourne le main_protein normalisé, ou "" si non renseigné. */
export function getMainProtein(recipe: Recipe): string {
  return normalizeText(recipe.main_protein);
}

/** Retourne tous les main_protein (la colonne peut contenir plusieurs valeurs). */
export function getMainProteins(recipe: Recipe): string[] {
  return parseMultiValue(recipe.main_protein);
}

/** Retourne le main_carb normalisé. */
export function getMainCarb(recipe: Recipe): string {
  return normalizeText(recipe.main_carb);
}

export function getMainCarbs(recipe: Recipe): string[] {
  return parseMultiValue(recipe.main_carb);
}

/** Retourne les main_vegetables normalisés. */
export function getMainVegetables(recipe: Recipe): string[] {
  return parseMultiValue(recipe.main_vegetables);
}

/** Retourne le dish_type normalisé. */
export function getDishType(recipe: Recipe): string {
  return normalizeText(recipe.dish_type);
}

/** Retourne les diet_tags normalisés (ex. "vegetarien", "sans gluten"). */
export function getDietTags(recipe: Recipe): string[] {
  return parseMultiValue(recipe.diet_tags);
}

/** Retourne les allergens normalisés (ex. "gluten", "lactose"). */
export function getAllergens(recipe: Recipe): string[] {
  return parseMultiValue(recipe.allergens);
}

/**
 * Retourne les ingredient_tags normalisés.
 * NB : la colonne s'appelle `igredient_tags` en base (typo conservée pour ne pas casser).
 */
export function getIngredientTags(recipe: Recipe): string[] {
  return parseMultiValue(recipe.igredient_tags ?? recipe.ingredient_tags);
}

/**
 * Récupère la chaîne d'ingrédients (avec fallback ancien nom).
 * Priorité : ingredients_quantites (nouveau) → ingredients (legacy)
 */
export function getIngredientsText(recipe: Recipe): string {
  return (recipe.ingredients_quantites || recipe.ingredients || "").toString();
}

/** Récupère le texte des équipements (avec fallback ancien nom). */
export function getEquipementsText(recipe: Recipe): string {
  return (recipe.equipements_necessaires || recipe.equipements || "").toString();
}

/** Récupère les calories par portion (avec fallback ancien nom). */
export function getCaloriesPerPortion(recipe: Recipe): number | null {
  const v = recipe.calories_par_portion ?? recipe.calories;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Famille effective d'une recette : on privilégie dish_type (renseigné en base)
 * puis family puis meal_subtype. Permet d'avoir une signature stable pour
 * le contrôle de diversité.
 */
export function getEffectiveFamily(recipe: Recipe): string {
  return normalizeText(recipe.dish_type || recipe.family || recipe.meal_subtype || "");
}

/**
 * Méthode de cuisson normalisée. La colonne DB peut contenir une seule valeur
 * (ex. "four", "poele") ou plusieurs séparées.
 */
export function getCookingMethods(recipe: Recipe): string[] {
  return parseMultiValue(recipe.cooking_method);
}

export function getCookingMethod(recipe: Recipe): string {
  return normalizeText(recipe.cooking_method);
}

/** Texture normalisée. */
export function getTexture(recipe: Recipe): string {
  return normalizeText(recipe.texture);
}

