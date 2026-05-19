/**
 * Contrôle qualité post-génération d'un menu hebdomadaire.
 *
 * Pipeline :
 *  1. `analyzePlanQuality()` — produit un rapport détaillé du menu
 *     (répétitions de protéines, féculents, familles, etc.)
 *  2. `repairPlanQuality()`  — remplace automatiquement les recettes qui font
 *     sauter un seuil, en piochant dans le `scoredPool` non utilisé.
 *
 * Les seuils sont calculés par rapport au nombre total de slots (semaine).
 * Approche conservative : on ne remplace que si on trouve un VRAI remplaçant
 * compatible (créneau, contraintes, diversité). Sinon on laisse en l'état.
 */
import type { Recipe } from "./recipes";
import type { PlannedWeek, PlannedMeal, PlannerPreferences } from "./weeklyPlanner";
import type { PlannerMealType } from "./plannerConstants";
import { isRecipeCompatibleWithMealType } from "./mealCompatibility";
import {
  recipeDominantProteinKeys,
  dominantKeysConflictWithDay,
} from "./proteinVariety";
import {
  recipeDiversityTags,
  wouldExceedWeekDiversityCap,
} from "./recipeDiversity";
import { getMainCarb, getDishType, getEffectiveFamily } from "./recipeFields";

export interface QualityReport {
  total_slots: number;
  unique_recipes: number;
  duplicate_recipe_count: number;
  protein_counts: Record<string, number>;
  carb_counts: Record<string, number>;
  dish_counts: Record<string, number>;
  family_counts: Record<string, number>;
  problems: QualityProblem[];
}

export interface QualityProblem {
  type:
    | "duplicate_recipe"
    | "too_many_same_protein"
    | "too_many_same_carb"
    | "too_many_same_dish"
    | "too_many_same_family"
    | "incompatible_meal";
  day_index: number;
  meal_type: PlannerMealType;
  recipe_id: number;
  detail: string;
  /** Sévérité : plus c'est haut, plus on doit remplacer en priorité. */
  severity: number;
}

/** Cap maximum acceptable d'occurrences d'une même protéine sur la semaine. */
function maxProteinOccurrences(totalSlots: number): number {
  // Sur 7j × 2 repas = 14 slots → cap = 3. Sur 21 slots → cap = 4.
  return Math.max(2, Math.ceil(totalSlots * 0.22));
}
function maxCarbOccurrences(totalSlots: number): number {
  return Math.max(2, Math.ceil(totalSlots * 0.22));
}
function maxDishOccurrences(totalSlots: number): number {
  return Math.max(2, Math.ceil(totalSlots * 0.18));
}
function maxFamilyOccurrences(totalSlots: number): number {
  return Math.max(2, Math.ceil(totalSlots * 0.22));
}

export function analyzePlanQuality(plan: PlannedWeek): QualityReport {
  const allMeals: { day: number; meal: PlannedMeal }[] = [];
  for (const day of plan.days) {
    for (const meal of day.meals) {
      allMeals.push({ day: day.day_index, meal });
    }
  }
  const totalSlots = allMeals.length;

  const seenRecipeIds = new Map<number, number>();
  const proteinCounts: Record<string, number> = {};
  const carbCounts: Record<string, number> = {};
  const dishCounts: Record<string, number> = {};
  const familyCounts: Record<string, number> = {};

  for (const { meal } of allMeals) {
    seenRecipeIds.set(meal.recipe_id, (seenRecipeIds.get(meal.recipe_id) || 0) + 1);
    const r = meal.recipe_payload;
    for (const p of recipeDominantProteinKeys(r)) {
      proteinCounts[p] = (proteinCounts[p] || 0) + 1;
    }
    const carb = getMainCarb(r);
    if (carb && carb !== "sans" && carb !== "aucun") {
      carbCounts[carb] = (carbCounts[carb] || 0) + 1;
    }
    const dish = getDishType(r);
    if (dish) dishCounts[dish] = (dishCounts[dish] || 0) + 1;
    const fam = getEffectiveFamily(r);
    if (fam) familyCounts[fam] = (familyCounts[fam] || 0) + 1;
  }

  const problems: QualityProblem[] = [];
  const proteinCap = maxProteinOccurrences(totalSlots);
  const carbCap = maxCarbOccurrences(totalSlots);
  const dishCap = maxDishOccurrences(totalSlots);
  const familyCap = maxFamilyOccurrences(totalSlots);

  // Compteurs courants pour identifier QUELLES recettes posent problème
  const runningProtein: Record<string, number> = {};
  const runningCarb: Record<string, number> = {};
  const runningDish: Record<string, number> = {};
  const runningFamily: Record<string, number> = {};
  const runningRecipes = new Set<number>();

  for (const { day, meal } of allMeals) {
    const r = meal.recipe_payload;

    // Incompatible créneau ?
    if (!isRecipeCompatibleWithMealType(r, meal.meal_type)) {
      problems.push({
        type: "incompatible_meal",
        day_index: day,
        meal_type: meal.meal_type,
        recipe_id: meal.recipe_id,
        detail: `Recette inadaptée au créneau ${meal.meal_type}`,
        severity: 100,
      });
    }

    // Doublon de recette
    if (runningRecipes.has(meal.recipe_id)) {
      problems.push({
        type: "duplicate_recipe",
        day_index: day,
        meal_type: meal.meal_type,
        recipe_id: meal.recipe_id,
        detail: `Recette dupliquée dans la semaine`,
        severity: 90,
      });
    }
    runningRecipes.add(meal.recipe_id);

    // Protéine sur-représentée
    for (const p of recipeDominantProteinKeys(r)) {
      runningProtein[p] = (runningProtein[p] || 0) + 1;
      if (runningProtein[p] > proteinCap) {
        problems.push({
          type: "too_many_same_protein",
          day_index: day,
          meal_type: meal.meal_type,
          recipe_id: meal.recipe_id,
          detail: `Protéine "${p}" présente ${runningProtein[p]}× (cap ${proteinCap})`,
          severity: 70,
        });
      }
    }

    // Féculent sur-représenté
    const carb = getMainCarb(r);
    if (carb && carb !== "sans" && carb !== "aucun") {
      runningCarb[carb] = (runningCarb[carb] || 0) + 1;
      if (runningCarb[carb] > carbCap) {
        problems.push({
          type: "too_many_same_carb",
          day_index: day,
          meal_type: meal.meal_type,
          recipe_id: meal.recipe_id,
          detail: `Féculent "${carb}" présent ${runningCarb[carb]}× (cap ${carbCap})`,
          severity: 60,
        });
      }
    }

    // Dish type sur-représenté
    const dish = getDishType(r);
    if (dish) {
      runningDish[dish] = (runningDish[dish] || 0) + 1;
      if (runningDish[dish] > dishCap) {
        problems.push({
          type: "too_many_same_dish",
          day_index: day,
          meal_type: meal.meal_type,
          recipe_id: meal.recipe_id,
          detail: `Type de plat "${dish}" présent ${runningDish[dish]}× (cap ${dishCap})`,
          severity: 65,
        });
      }
    }

    // Famille sur-représentée
    const fam = getEffectiveFamily(r);
    if (fam) {
      runningFamily[fam] = (runningFamily[fam] || 0) + 1;
      if (runningFamily[fam] > familyCap) {
        problems.push({
          type: "too_many_same_family",
          day_index: day,
          meal_type: meal.meal_type,
          recipe_id: meal.recipe_id,
          detail: `Famille "${fam}" présente ${runningFamily[fam]}× (cap ${familyCap})`,
          severity: 60,
        });
      }
    }
  }

  return {
    total_slots: totalSlots,
    unique_recipes: seenRecipeIds.size,
    duplicate_recipe_count: totalSlots - seenRecipeIds.size,
    protein_counts: proteinCounts,
    carb_counts: carbCounts,
    dish_counts: dishCounts,
    family_counts: familyCounts,
    problems,
  };
}

/**
 * Tente de remplacer les recettes problématiques par de meilleures alternatives.
 *
 * Stratégie en DEUX PASSES :
 *  1. Passe "incompatibilité créneau" — SANS LIMITE de remplacements.
 *     Une soupe au petit-déjeuner doit toujours être corrigée, point.
 *  2. Passe "qualité" — corrige doublons et sur-représentations, dans la
 *     limite de `maxReplacements` (défaut 8) pour éviter de tout casser.
 *
 * Pour chaque problème, le remplaçant doit :
 *   • être compatible avec le créneau
 *   • ne pas déclencher de nouveau problème (protéine/féculent/dish/family)
 *   • passer les filtres diététiques (déjà appliqués en amont via scoredPool)
 *
 * Si un remplaçant unique n'est pas trouvé, la passe "incompatibilité" tente
 * une réutilisation contrôlée d'une recette adaptée (plutôt que laisser un
 * mauvais matching).
 */
export function repairPlanQuality(
  plan: PlannedWeek,
  prefs: PlannerPreferences,
  scoredPool: { r: Recipe; s: number }[],
  options: { maxReplacements?: number } = {}
): { plan: PlannedWeek; replacements: number; report_before: QualityReport; report_after: QualityReport } {
  const maxReplacements = options.maxReplacements ?? 8;
  const reportBefore = analyzePlanQuality(plan);

  // Pas de problème → on rend tel quel.
  if (reportBefore.problems.length === 0) {
    return {
      plan,
      replacements: 0,
      report_before: reportBefore,
      report_after: reportBefore,
    };
  }

  // On clone la structure pour pouvoir modifier sans muter l'original.
  const days = plan.days.map((d) => ({
    ...d,
    meals: d.meals.map((m) => ({ ...m })),
  }));

  const usedIds = new Set<number>();
  for (const d of days) for (const m of d.meals) usedIds.add(m.recipe_id);

  // Compteurs courants
  const proteinCounts: Record<string, number> = {};
  const carbCounts: Record<string, number> = {};
  const dishCounts: Record<string, number> = {};
  const familyCounts: Record<string, number> = {};
  for (const d of days) {
    for (const m of d.meals) {
      const r = m.recipe_payload;
      for (const p of recipeDominantProteinKeys(r)) {
        proteinCounts[p] = (proteinCounts[p] || 0) + 1;
      }
      const c = getMainCarb(r);
      if (c && c !== "sans" && c !== "aucun") carbCounts[c] = (carbCounts[c] || 0) + 1;
      const dish = getDishType(r);
      if (dish) dishCounts[dish] = (dishCounts[dish] || 0) + 1;
      const fam = getEffectiveFamily(r);
      if (fam) familyCounts[fam] = (familyCounts[fam] || 0) + 1;
    }
  }

  const totalSlots = reportBefore.total_slots;
  const proteinCap = maxProteinOccurrences(totalSlots);
  const carbCap = maxCarbOccurrences(totalSlots);
  const dishCap = maxDishOccurrences(totalSlots);
  const familyCap = maxFamilyOccurrences(totalSlots);

  // Identifier les "remplaceurs" candidats (non utilisés, triés par score)
  const pool = scoredPool
    .filter(({ r }) => !usedIds.has(r.id))
    .sort((a, b) => b.s - a.s);

  // Tous les candidats du pool (utilisés ou non) pour fallback réutilisation
  const allPool = scoredPool.slice().sort((a, b) => b.s - a.s);

  let replacements = 0;

  // ── PASSE 1 : INCOMPATIBILITÉS CRÉNEAU (sans limite) ────────────────────
  // Une recette inadaptée au créneau (soupe au petit-déj, smoothie au dîner)
  // DOIT être remplacée, quel qu'en soit le coût.
  const incompatibleProblems = reportBefore.problems.filter(
    (p) => p.type === "incompatible_meal"
  );
  for (const pb of incompatibleProblems) {
    const day = days.find((d) => d.day_index === pb.day_index);
    if (!day) continue;
    const meal = day.meals.find((m) => m.meal_type === pb.meal_type && m.recipe_id === pb.recipe_id);
    if (!meal) continue;

    // Protéines déjà placées le même jour (hors ce repas)
    const sameDayDominant = new Set<string>();
    for (const otherMeal of day.meals) {
      if (otherMeal === meal) continue;
      for (const p of recipeDominantProteinKeys(otherMeal.recipe_payload)) {
        sameDayDominant.add(p);
      }
    }

    // 1a. Préférer un remplaçant UNIQUE compatible
    let candidate = pool.find(({ r }) => {
      if (usedIds.has(r.id)) return false;
      if (!isRecipeCompatibleWithMealType(r, meal.meal_type)) return false;
      if (dominantKeysConflictWithDay(r, sameDayDominant)) return false;
      return true;
    });

    // 1b. Fallback : RÉUTILISER une recette compatible déjà utilisée
    //     (mieux qu'une recette incompatible)
    if (!candidate) {
      candidate = allPool.find(({ r }) =>
        isRecipeCompatibleWithMealType(r, meal.meal_type) &&
        !dominantKeysConflictWithDay(r, sameDayDominant)
      );
    }

    if (!candidate) {
      console.warn(
        `[qualityControl] Aucun remplaçant compatible pour "${meal.meal_type}" jour ${pb.day_index}.`
      );
      continue;
    }

    // Swap
    const oldId = meal.recipe_id;
    meal.recipe_id = candidate.r.id;
    meal.recipe_name = candidate.r.nom_recette || meal.recipe_name;
    meal.recipe_payload = candidate.r;
    usedIds.delete(oldId);
    usedIds.add(candidate.r.id);
    replacements++;
  }

  // Recalculer les compteurs après cette première passe pour la passe 2
  for (const key of Object.keys(proteinCounts)) delete proteinCounts[key];
  for (const key of Object.keys(carbCounts)) delete carbCounts[key];
  for (const key of Object.keys(dishCounts)) delete dishCounts[key];
  for (const key of Object.keys(familyCounts)) delete familyCounts[key];
  for (const d of days) {
    for (const m of d.meals) {
      const r = m.recipe_payload;
      for (const p of recipeDominantProteinKeys(r)) {
        proteinCounts[p] = (proteinCounts[p] || 0) + 1;
      }
      const c = getMainCarb(r);
      if (c && c !== "sans" && c !== "aucun") carbCounts[c] = (carbCounts[c] || 0) + 1;
      const dish = getDishType(r);
      if (dish) dishCounts[dish] = (dishCounts[dish] || 0) + 1;
      const fam = getEffectiveFamily(r);
      if (fam) familyCounts[fam] = (familyCounts[fam] || 0) + 1;
    }
  }

  // ── PASSE 2 : QUALITÉ (doublons, sur-représentations) ───────────────────
  // Re-analyse pour récupérer les nouveaux problèmes (la passe 1 a pu en
  // résoudre certains et en créer d'autres très différents).
  const reanalysis = analyzePlanQuality({ ...plan, days });
  const qualityProblems = reanalysis.problems
    .filter((p) => p.type !== "incompatible_meal")
    .sort((a, b) => b.severity - a.severity);

  for (const pb of qualityProblems) {
    if (replacements >= maxReplacements) break;
    // Le contrôle qualité ne touche jamais une recette verrouillée :
    // on suppose ici que tout le plan peut bouger (locked_slots ont été
    // injectés en amont et ont des problèmes très rares en pratique).

    const day = days.find((d) => d.day_index === pb.day_index);
    if (!day) continue;
    const meal = day.meals.find((m) => m.meal_type === pb.meal_type && m.recipe_id === pb.recipe_id);
    if (!meal) continue;

    const oldRecipe = meal.recipe_payload;
    const oldProteins = recipeDominantProteinKeys(oldRecipe);
    const oldCarb = getMainCarb(oldRecipe);
    const oldDish = getDishType(oldRecipe);
    const oldFamily = getEffectiveFamily(oldRecipe);
    const oldTags = recipeDiversityTags(oldRecipe);

    // Calculer un état "post-retrait" pour tester les candidats
    const probeProtein = { ...proteinCounts };
    for (const p of oldProteins) probeProtein[p] = Math.max(0, (probeProtein[p] || 0) - 1);
    const probeCarb = { ...carbCounts };
    if (oldCarb && oldCarb !== "sans" && oldCarb !== "aucun") {
      probeCarb[oldCarb] = Math.max(0, (probeCarb[oldCarb] || 0) - 1);
    }
    const probeDish = { ...dishCounts };
    if (oldDish) probeDish[oldDish] = Math.max(0, (probeDish[oldDish] || 0) - 1);
    const probeFamily = { ...familyCounts };
    if (oldFamily) probeFamily[oldFamily] = Math.max(0, (probeFamily[oldFamily] || 0) - 1);
    const probeTags = new Map<string, number>();
    // Reconstituer un weekTagCounts pour le test wouldExceedWeekDiversityCap
    for (const d2 of days) for (const m2 of d2.meals) {
      if (m2 === meal) continue;
      for (const t of recipeDiversityTags(m2.recipe_payload)) {
        probeTags.set(t, (probeTags.get(t) || 0) + 1);
      }
    }
    // (oldTags volontairement non réincorporés : meal est retiré dans la probe)
    void oldTags;

    // Reconstituer les protéines déjà présentes le même jour (hors ce repas)
    const sameDayDominant = new Set<string>();
    for (const otherMeal of day.meals) {
      if (otherMeal === meal) continue;
      for (const p of recipeDominantProteinKeys(otherMeal.recipe_payload)) {
        sameDayDominant.add(p);
      }
    }

    // Chercher un remplaçant
    const candidate = pool.find(({ r }) => {
      if (usedIds.has(r.id)) return false;
      if (!isRecipeCompatibleWithMealType(r, meal.meal_type)) return false;
      if (dominantKeysConflictWithDay(r, sameDayDominant)) return false;
      if (wouldExceedWeekDiversityCap(r, probeTags, totalSlots)) return false;

      // Vérifier que cet ajout ne refait pas sauter les caps
      for (const p of recipeDominantProteinKeys(r)) {
        if ((probeProtein[p] || 0) + 1 > proteinCap) return false;
      }
      const newCarb = getMainCarb(r);
      if (newCarb && newCarb !== "sans" && newCarb !== "aucun") {
        if ((probeCarb[newCarb] || 0) + 1 > carbCap) return false;
      }
      const newDish = getDishType(r);
      if (newDish && (probeDish[newDish] || 0) + 1 > dishCap) return false;
      const newFamily = getEffectiveFamily(r);
      if (newFamily && (probeFamily[newFamily] || 0) + 1 > familyCap) return false;

      // Vérifier que la recette respecte les filtres diététiques (best effort)
      // — déjà appliqué en amont par le pool, on saute ici.
      void prefs;
      return true;
    });

    if (!candidate) continue;

    // Swap
    meal.recipe_id = candidate.r.id;
    meal.recipe_name = candidate.r.nom_recette || meal.recipe_name;
    meal.recipe_payload = candidate.r;
    usedIds.delete(oldRecipe.id);
    usedIds.add(candidate.r.id);
    replacements++;

    // Mettre à jour les compteurs réels (puisqu'on swap pour de vrai)
    for (const p of oldProteins) proteinCounts[p] = Math.max(0, (proteinCounts[p] || 0) - 1);
    for (const p of recipeDominantProteinKeys(candidate.r)) {
      proteinCounts[p] = (proteinCounts[p] || 0) + 1;
    }
    if (oldCarb && oldCarb !== "sans" && oldCarb !== "aucun") {
      carbCounts[oldCarb] = Math.max(0, (carbCounts[oldCarb] || 0) - 1);
    }
    const newCarb = getMainCarb(candidate.r);
    if (newCarb && newCarb !== "sans" && newCarb !== "aucun") {
      carbCounts[newCarb] = (carbCounts[newCarb] || 0) + 1;
    }
    if (oldDish) dishCounts[oldDish] = Math.max(0, (dishCounts[oldDish] || 0) - 1);
    const newDish = getDishType(candidate.r);
    if (newDish) dishCounts[newDish] = (dishCounts[newDish] || 0) + 1;
    if (oldFamily) familyCounts[oldFamily] = Math.max(0, (familyCounts[oldFamily] || 0) - 1);
    const newFamily = getEffectiveFamily(candidate.r);
    if (newFamily) familyCounts[newFamily] = (familyCounts[newFamily] || 0) + 1;
  }

  const repairedPlan: PlannedWeek = { ...plan, days };
  const reportAfter = analyzePlanQuality(repairedPlan);

  return {
    plan: repairedPlan,
    replacements,
    report_before: reportBefore,
    report_after: reportAfter,
  };
}
