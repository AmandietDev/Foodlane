/**
 * Batch cooking : detecte les recettes qui peuvent etre preparees une fois
 * et consommees sur plusieurs creneaux/jours, puis les repartit dans la
 * semaine en evitant de modifier les creneaux verrouilles.
 *
 * Principe :
 *   - Si l'utilisateur a coche l'objectif "batch" dans ses preferences,
 *     applyBatchCooking() est appele apres la generation du plan.
 *   - Pour chaque creneau, on regarde si sa recette est "batchable"
 *     (par dish_type + nombre_personnes).
 *   - Si oui, on cherche les N creneaux suivants compatibles (meme type
 *     de repas, non verrouilles) et on y duplique la recette en marquant
 *     l'origine + les reprises avec un meme batch_group_id.
 *   - buildGroceryFromPlan ignore les reprises pour ne pas compter
 *     les ingredients plusieurs fois.
 */

import { randomUUID } from "crypto";
import type { Recipe } from "./recipes";
import type { PlannerMealType } from "./plannerConstants";
import type { PlannedWeek, PlannedMeal, LockedSlot } from "./weeklyPlanner";
import { getDishType, normalizeText } from "./recipeFields";
import { resolvePortionStrategy } from "./recipePortionStrategy";

// ─────────────────────────────────────────────────────────────────────
// Liste des dish_type considere comme "batchable"
// ─────────────────────────────────────────────────────────────────────

/**
 * Dish types sucres / petit-dej / collation qui se conservent bien
 * et qu'on prepare habituellement en grande quantite (3 jours).
 */
const BATCHABLE_SWEET = new Set<string>([
  "gateau",
  "cake",
  "brioche",
  "financier",
  "cookie",
  "cookies",
  "muffin",
  "muffins",
  "madeleine",
  "granola",
  "energy_balls",
  "bouchees_energie",
  "overnight_oats",
  "chia_pudding",
  "baked_oats",
  "barre",
  "barre_chocolatee",
  "barre_granola",
  "brownie",
  "pancakes",
  "gaufres",
  "fromage_blanc",
  "compote",
  "yaourt",
  "yaourt_chevre",
  "yaourt_grec",
  "yaourt_coco",
  "biscuit",
  "biscuits",
  "fudge",
  "truffes",
  "pudding",
  "riz_au_lait",
  "thiakry",
]);

/**
 * Dish types sales / plats principaux qui se conservent au frigo
 * 1 a 2 jours (on les batch sur 2 creneaux maximum).
 */
const BATCHABLE_SAVORY = new Set<string>([
  "soupe",
  "soupe_froide",
  "soupe_repas",
  "veloute",
  "curry",
  "dahl",
  "chili",
  "mijote",
  "plat_mijote",
  "viande_mijotee",
  "ragout",
  "blanquette",
  "lasagne",
  "lasagnes",
  "gratin",
  "gratin_pates",
  "parmentier",
  "hachis",
  "cassoulet",
  "tajine",
  "couscous",
  "jambalaya",
  "moussaka",
  "tartiflette",
  "bolognaise",
  "basquaise",
  "one_pot",
  "plat_complet",
  "riz_saute",
  "wok",
  "polenta",
  "risotto",
  "quiche",
  "tarte",
  "cake_sale",
  "tortilla",
  "frittata",
]);

// Combien de jours supplementaires couvre un batch (en plus du jour de prep)
const SWEET_BATCH_REPEAT_DAYS = 2; // gateau lundi -> collation lundi/mardi/mercredi
const SAVORY_BATCH_REPEAT_DAYS = 1; // soupe lundi -> dejeuner ou diner lundi/mardi

// ─────────────────────────────────────────────────────────────────────
// Detection
// ─────────────────────────────────────────────────────────────────────

export type BatchCategory = "sweet" | "savory" | null;

/**
 * Determine la categorie batch d'une recette.
 * Returns null si non batchable.
 */
export function getBatchCategory(recipe: Recipe): BatchCategory {
  const dish = normalizeText(getDishType(recipe) || "");
  if (!dish) return null;

  // On accepte plusieurs dish_types separes par | ; ,
  const dishTokens = dish.split(/[|;,]/).map((t) => t.trim()).filter(Boolean);
  for (const token of dishTokens) {
    if (BATCHABLE_SWEET.has(token)) return "sweet";
    if (BATCHABLE_SAVORY.has(token)) return "savory";
  }
  return null;
}

/**
 * Verifie qu'une recette a assez de portions pour etre batchee pour un
 * foyer donne. On exige un minimum genereux pour eviter de batcher des
 * recettes "1 portion = 1 personne".
 */
export function hasEnoughPortionsForBatch(
  recipe: Recipe,
  householdSize: number
): boolean {
  const portions = Number(recipe.nombre_personnes) || 0;
  // Au moins 1.5x le foyer (ex: foyer 2 -> au moins 3 portions ; foyer 5 -> 8)
  return portions >= Math.max(2, Math.ceil(householdSize * 1.5));
}

/**
 * Combien de jours consecutifs un batch peut couvrir (en plus du jour de prep).
 */
export function getBatchRepeatDays(category: BatchCategory): number {
  if (category === "sweet") return SWEET_BATCH_REPEAT_DAYS;
  if (category === "savory") return SAVORY_BATCH_REPEAT_DAYS;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────
// Application sur un PlannedWeek
// ─────────────────────────────────────────────────────────────────────

export interface ApplyBatchOptions {
  /** Taille du foyer (sert au seuil minimum de portions). */
  householdSize: number;
  /** Creneaux verrouilles : on n'y touche jamais. */
  lockedSlots?: LockedSlot[];
}

interface LockedKey {
  dayIndex: number;
  mealType: string;
}

function isLocked(
  dayIndex: number,
  mealType: string,
  lockedSlots?: LockedSlot[]
): boolean {
  if (!lockedSlots || lockedSlots.length === 0) return false;
  return lockedSlots.some(
    (s) => s.day_index === dayIndex && s.meal_type === mealType
  );
}

/**
 * Strategie d'eligibilite des creneaux receveurs selon le type d'origine :
 *   - sweet sur breakfast -> on duplique sur breakfast suivants
 *   - sweet sur snack -> on duplique sur snack suivants
 *   - savory sur lunch -> on duplique sur lunch ou dinner suivants
 *   - savory sur dinner -> on duplique sur lunch ou dinner suivants
 */
function getEligibleTargetMealTypes(
  originMealType: PlannerMealType,
  category: BatchCategory
): PlannerMealType[] {
  if (category === "sweet") {
    return [originMealType];
  }
  // savory : lunch <-> dinner interchangeables
  if (originMealType === "lunch" || originMealType === "dinner") {
    return ["lunch", "dinner"];
  }
  return [originMealType];
}

/**
 * Applique la logique batch cooking sur un plan deja genere.
 * Mute le plan en place et retourne le nombre de batchs crees.
 */
export function applyBatchCooking(
  plan: PlannedWeek,
  options: ApplyBatchOptions
): { batches_created: number; meals_replaced: number } {
  const { householdSize, lockedSlots } = options;
  let batchesCreated = 0;
  let mealsReplaced = 0;

  // Track les creneaux deja consommes par un batch (origine ou reprise)
  // pour eviter de re-batcher par dessus.
  const consumedByBatch = new Set<string>(); // key = `${dayIndex}|${mealType}`
  const keyOf = (d: number, m: string) => `${d}|${m}`;

  for (let dayIdx = 0; dayIdx < plan.days.length; dayIdx++) {
    const day = plan.days[dayIdx];

    for (const meal of day.meals) {
      // Skip si deja partie d'un batch (origine ou reprise)
      if (consumedByBatch.has(keyOf(dayIdx, meal.meal_type))) continue;
      // Skip si deja marque (cas d'une re-execution)
      if (meal.batch_group_id) continue;
      // Skip si creneau d'origine verrouille : on respecte le choix user
      if (isLocked(dayIdx, meal.meal_type, lockedSlots)) continue;

      const recipe = meal.recipe_payload;
      const category = getBatchCategory(recipe);
      if (!category) continue;
      if (!hasEnoughPortionsForBatch(recipe, householdSize)) continue;

      const maxRepeats = getBatchRepeatDays(category);
      if (maxRepeats < 1) continue;

      const eligibleTypes = getEligibleTargetMealTypes(
        meal.meal_type,
        category
      );

      // Trouver jusqu'a maxRepeats creneaux cibles dans les jours suivants
      const targets: { dayIndex: number; mealRef: PlannedMeal }[] = [];
      for (
        let nextDay = dayIdx + 1;
        nextDay < plan.days.length && targets.length < maxRepeats;
        nextDay++
      ) {
        const nextDayObj = plan.days[nextDay];
        for (const candidate of nextDayObj.meals) {
          if (!eligibleTypes.includes(candidate.meal_type)) continue;
          if (consumedByBatch.has(keyOf(nextDay, candidate.meal_type))) continue;
          if (candidate.batch_group_id) continue;
          if (isLocked(nextDay, candidate.meal_type, lockedSlots)) continue;

          targets.push({ dayIndex: nextDay, mealRef: candidate });
          break; // un seul slot cible par jour
        }
      }

      if (targets.length === 0) continue;

      // Creer le batch
      const groupId = randomUUID();
      const totalServings = householdSize * (targets.length + 1);

      meal.batch_group_id = groupId;
      meal.is_batch_origin = true;
      meal.batch_servings = totalServings;
      consumedByBatch.add(keyOf(dayIdx, meal.meal_type));

      for (const t of targets) {
        // On remplace le contenu du slot par la recette batchee
        t.mealRef.recipe_id = recipe.id;
        t.mealRef.recipe_name = recipe.nom_recette || meal.recipe_name;
        t.mealRef.recipe_payload = recipe;
        t.mealRef.batch_group_id = groupId;
        t.mealRef.is_batch_origin = false;
        t.mealRef.batch_servings = totalServings;
        consumedByBatch.add(keyOf(t.dayIndex, t.mealRef.meal_type));
        mealsReplaced++;
      }

      batchesCreated++;
    }
  }

  return { batches_created: batchesCreated, meals_replaced: mealsReplaced };
}

export interface ApplyPortionAdaptationOptions {
  householdPortions: number;
  lockedSlots?: LockedSlot[];
}

/**
 * Adapte chaque repas au foyer : annotation scale + batch portions si scaling trop complexe.
 * Le batch portions cuisine la recette telle quelle (nombre_personnes) sur plusieurs créneaux.
 */
export function applyPortionAdaptations(
  plan: PlannedWeek,
  options: ApplyPortionAdaptationOptions
): { portion_batch_count: number; scaled_count: number } {
  const { householdPortions, lockedSlots } = options;
  let portionBatchCount = 0;
  let scaledCount = 0;
  const consumedByBatch = new Set<string>();
  const keyOf = (d: number, m: string) => `${d}|${m}`;

  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (meal.batch_group_id) continue;
      const strategy = resolvePortionStrategy(meal.recipe_payload, householdPortions);
      if (strategy.mode === "scale") {
        meal.portion_adaptation = "scale";
        meal.portion_note = strategy.detailFr;
        scaledCount++;
      } else if (strategy.mode === "none") {
        meal.portion_adaptation = null;
        meal.portion_note = null;
      }
    }
  }

  for (let dayIdx = 0; dayIdx < plan.days.length; dayIdx++) {
    const day = plan.days[dayIdx];

    for (const meal of day.meals) {
      if (consumedByBatch.has(keyOf(dayIdx, meal.meal_type))) continue;
      if (meal.batch_group_id) continue;
      if (isLocked(dayIdx, meal.meal_type, lockedSlots)) continue;

      const recipe = meal.recipe_payload;
      const strategy = resolvePortionStrategy(recipe, householdPortions);
      if (strategy.mode !== "batch_portions" || !strategy.batchMealCount) continue;

      const category = getBatchCategory(recipe);
      if (!category) continue;

      const neededTargets = strategy.batchMealCount - 1;
      const eligibleTypes = getEligibleTargetMealTypes(meal.meal_type, category);
      const targets: { dayIndex: number; mealRef: PlannedMeal }[] = [];

      for (
        let nextDay = dayIdx;
        nextDay < plan.days.length && targets.length < neededTargets;
        nextDay++
      ) {
        const nextDayObj = plan.days[nextDay];
        for (const candidate of nextDayObj.meals) {
          if (nextDay === dayIdx && candidate.meal_type === meal.meal_type) continue;
          if (!eligibleTypes.includes(candidate.meal_type)) continue;
          if (consumedByBatch.has(keyOf(nextDay, candidate.meal_type))) continue;
          if (candidate.batch_group_id) continue;
          if (isLocked(nextDay, candidate.meal_type, lockedSlots)) continue;

          targets.push({ dayIndex: nextDay, mealRef: candidate });
          if (targets.length >= neededTargets) break;
        }
      }

      if (targets.length < neededTargets) {
        meal.portion_adaptation = "scale";
        meal.portion_note = `Quantités adaptées pour ${householdPortions} pers. (recette de base ${strategy.recipePortions} pers.).`;
        scaledCount++;
        continue;
      }

      const groupId = randomUUID();
      const recipePortions = strategy.recipePortions;

      meal.batch_group_id = groupId;
      meal.is_batch_origin = true;
      meal.batch_servings = recipePortions;
      meal.portion_adaptation = "batch_portions";
      meal.portion_note = strategy.detailFr;
      consumedByBatch.add(keyOf(dayIdx, meal.meal_type));

      for (const t of targets) {
        t.mealRef.recipe_id = recipe.id;
        t.mealRef.recipe_name = recipe.nom_recette || meal.recipe_name;
        t.mealRef.recipe_payload = recipe;
        t.mealRef.batch_group_id = groupId;
        t.mealRef.is_batch_origin = false;
        t.mealRef.batch_servings = recipePortions;
        t.mealRef.portion_adaptation = "batch_portions";
        t.mealRef.portion_note = strategy.detailFr;
        consumedByBatch.add(keyOf(t.dayIndex, t.mealRef.meal_type));
      }

      portionBatchCount++;
    }
  }

  return { portion_batch_count: portionBatchCount, scaled_count: scaledCount };
}

/**
 * Determine si l'utilisateur a active le batch cooking via ses objectifs.
 */
export function isBatchCookingEnabled(
  objectives: string[] | null | undefined
): boolean {
  if (!objectives || objectives.length === 0) return false;
  return objectives.some((o) => normalizeText(o) === "batch");
}
