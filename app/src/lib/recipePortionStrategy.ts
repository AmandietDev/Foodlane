/**
 * Stratégie d'adaptation des recettes à la taille du foyer :
 * - mise à l'échelle des quantités (cas simple)
 * - batch cooking sur plusieurs repas (si le scaling serait trop pénible)
 */

import type { Recipe } from "./recipes";
import { getBatchCategory } from "./batchCooking";
import {
  getScalingFactor,
  parseIngredientLine,
  roundSmartQuantity,
  type CanonicalUnit,
} from "./ingredientQuantities";

export type PortionAdaptationMode = "none" | "scale" | "batch_portions";

export interface PortionStrategyResult {
  mode: PortionAdaptationMode;
  recipePortions: number;
  householdPortions: number;
  scalingFactor: number;
  /** Nombre de repas couverts si mode batch_portions */
  batchMealCount: number | null;
  isComplexScale: boolean;
  /** Court libellé UI */
  labelFr: string;
  /** Détail pour infobulle */
  detailFr: string;
}

function recipeBasePortions(recipe: Recipe): number {
  const n = Number(recipe.nombre_personnes);
  return n > 0 ? n : 1;
}

/** Ratio simple : multiple entier à la hausse ou à la baisse (ex. 4→2, 2→4). */
export function isCleanPortionRatio(basePortions: number, householdPortions: number): boolean {
  const base = Math.max(1, basePortions);
  const target = Math.max(1, householdPortions);
  if (base === target) return true;
  if (target > base) return target % base === 0 && target / base <= 4;
  return base % target === 0;
}

/**
 * Détecte un scaling « pénible » (œufs en demi-unités, ratios 3→2, etc.).
 */
export function isScalingComplex(recipe: Recipe, householdPortions: number): boolean {
  const base = recipeBasePortions(recipe);
  const target = Math.max(1, householdPortions);
  if (base === target) return false;

  const factor = getScalingFactor(recipe, target);
  if (!isCleanPortionRatio(base, target)) return true;

  const parts = (recipe.ingredients || "").split(";").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const parsed = parseIngredientLine(part);
    if (parsed.canonicalQuantity == null || !parsed.canonicalUnit) continue;
    const scaled = parsed.canonicalQuantity * factor;
    const rounded = roundSmartQuantity(scaled, parsed.canonicalUnit as CanonicalUnit);
    if (parsed.canonicalUnit === "piece" && scaled > 0) {
      const frac = scaled - Math.floor(scaled);
      if (frac > 0.05 && frac < 0.95 && Math.abs(rounded - scaled) > 0.4) {
        return true;
      }
    }
    if ((parsed.canonicalUnit === "tbsp" || parsed.canonicalUnit === "tsp") && scaled > 0) {
      const frac = (scaled * 4) % 1;
      if (frac > 0.1 && frac < 0.9) return true;
    }
  }

  return false;
}

/** Nombre de repas du foyer couverts en cuisinant la recette telle quelle. */
export function batchMealCountFromPortions(
  recipePortions: number,
  householdPortions: number
): number {
  const base = Math.max(1, recipePortions);
  const target = Math.max(1, householdPortions);
  if (base < target) return 0;
  return Math.floor(base / target);
}

/**
 * Choisit scale vs batch_portions (jamais batch si recette non batchable ou < 2 repas).
 */
export function resolvePortionStrategy(
  recipe: Recipe,
  householdPortions: number
): PortionStrategyResult {
  const recipePortions = recipeBasePortions(recipe);
  const target = Math.max(1, householdPortions);
  const factor = getScalingFactor(recipe, target);
  const complex = isScalingComplex(recipe, target);
  const batchMeals = batchMealCountFromPortions(recipePortions, target);
  const batchable = getBatchCategory(recipe) !== null;

  if (recipePortions === target) {
    return {
      mode: "none",
      recipePortions,
      householdPortions: target,
      scalingFactor: 1,
      batchMealCount: null,
      isComplexScale: false,
      labelFr: `Pour ${target} pers.`,
      detailFr: `Recette prévue pour ${target} personne${target > 1 ? "s" : ""}.`,
    };
  }

  const canBatch = batchable && batchMeals >= 2;

  if (complex && canBatch) {
    return {
      mode: "batch_portions",
      recipePortions,
      householdPortions: target,
      scalingFactor: 1,
      batchMealCount: batchMeals,
      isComplexScale: true,
      labelFr: `Batch · ${batchMeals} repas`,
      detailFr: `Recette pour ${recipePortions} pers. → ${batchMeals} repas pour ${target} pers. (quantités d'origine, sans diviser).`,
    };
  }

  return {
    mode: "scale",
    recipePortions,
    householdPortions: target,
    scalingFactor: factor,
    batchMealCount: null,
    isComplexScale: complex,
    labelFr: `Pour ${target} pers.`,
    detailFr:
      recipePortions !== target
        ? `Quantités adaptées pour ${target} pers. (recette de base ${recipePortions} pers.).`
        : `Pour ${target} pers.`,
  };
}
