import type { Recipe } from "./recipes";
import {
  displayUnitForStorage,
  normalizeGroceryUnit,
  sanitizeGroceryIngredientName,
  stripEpicesCondimentsLabel,
  type GroceryCategorySlug,
} from "./groceryFormat";
import {
  filterRecipesForSeasonalPool,
  getCurrentSeason,
  isExplicitlyWrongSeason,
  isRecipeSeasonal,
  scoreRecipeSeasonRelevance,
  type Season,
} from "./seasonalFilter";
import { sortMealTypesForDisplay, sortMealsByDisplayOrder } from "./mealOrder";
import {
  EQUIPMENT_KEY_SYNONYMS,
  type BreakfastPreferenceKey,
  type CookingSkillLevel,
  type CookingTimeKey,
  type DietaryFilterKey,
  type MealStructureKey,
  type PlannerMealType,
} from "./plannerConstants";
import {
  addRecipeDominantKeys,
  dominantKeysConflictWithDay,
} from "./proteinVariety";
import { isRecipeCompatibleWithMealType, scoreBreakfastPreference } from "./mealCompatibility";
import {
  addRecipeDiversityTags,
  wouldExceedWeekDiversityCap,
} from "./recipeDiversity";
import { rerankWithMMR } from "./mmrRanking";
import {
  filterRecipesByStructuredDietaryRules,
  recipeContainsUserAllergen,
} from "./dietaryStructured";
import {
  getMainCarb,
  getMainProteins,
  getMainVegetables,
  getDishType,
} from "./recipeFields";
import {
  formatScaledIngredient,
  getScalingFactor,
  normalizeIngredientNameForMerge,
  parseIngredientLine as parseIngredientWithUnits,
  scaleIngredientQuantity,
  type ParsedIngredient,
} from "./ingredientQuantities";

export type GroceryCategory = GroceryCategorySlug;

export interface PlannerPreferences {
  cooking_time_preference: CookingTimeKey;
  cooking_skill_level: CookingSkillLevel;
  household_size: number;
  /** Pour un foyer de 5 pers. : 4, 5 ou 6 portions pour recettes / courses ; ignoré sinon. */
  recipe_scaling_portions: number | null;
  adults_count: number;
  children_count: number;
  planning_days: number;
  meal_types: PlannerMealType[];
  meal_structure: MealStructureKey;
  objectives: string[];
  /** Texte libre si l’utilisateur choisit « Autre » (objectifs), max 150 car. côté UI */
  custom_goal: string | null;
  dietary_filters: DietaryFilterKey[];
  world_cuisines: string[];
  seasonal_preference: boolean;
  breakfast_preference: BreakfastPreferenceKey;
  equipment_keys: string[];
  allergy_keys: string[];
  excluded_ingredients: string[];
}

export interface PlannerGenerateInput extends Partial<PlannerPreferences> {
  variety_boost?: number;
}

/** Portions utilisées pour mettre à l’échelle ingrédients et liste de courses. */
export function getEffectiveRecipePortions(
  prefs: Pick<PlannerPreferences, "household_size" | "recipe_scaling_portions">
): number {
  const h = Math.max(1, Number(prefs.household_size) || 1);
  if (h !== 5) return h;
  const r = prefs.recipe_scaling_portions;
  if (r === 4 || r === 5 || r === 6) return r;
  return 5;
}

const FILTER_EXCLUSIONS: Record<DietaryFilterKey, string[]> = {
  vegetarien: [
    "viande", "porc", "bœuf", "boeuf", "poulet", "agneau", "jambon", "bacon", "lardons",
    "saucisse", "poisson", "thon", "saumon", "cabillaud", "crevettes", "moules",
  ],
  vegan: [
    "viande", "porc", "bœuf", "boeuf", "poulet", "agneau", "jambon", "bacon", "lardons",
    "saucisse", "poisson", "thon", "saumon", "lait", "yaourt", "fromage", "beurre", "crème",
    "œufs", "œuf", "oeufs", "oeuf", "miel",
  ],
  pescetarien: ["viande", "porc", "bœuf", "boeuf", "poulet", "agneau", "jambon", "bacon", "lardons", "saucisse"],
  flexitarien: [],
  sans_gluten: [
    "blé", "ble", "farine", "pâtes", "pates", "pain", "semoule", "boulgour", "orge", "seigle",
    "avoine", "épeautre", "gnocchi", "couscous", "biscuit", "gâteau", "gateau", "quiche",
  ],
  sans_lactose: [
    "lait", "yaourt", "fromage", "beurre", "crème", "mozzarella", "parmesan", "emmental",
  ],
  sans_porc: ["porc", "jambon", "bacon", "lardons", "chorizo"],
  sans_fruits_coque: [
    "noix", "amande", "amandes", "noisette", "noisettes", "cajou", "pistache", "pistaches",
    "noix de pécan", "macadamia",
  ],
  sans_arachides: ["arachide", "cacahuète", "cacahuetes", "beurre de cacahuète"],
  sans_oeufs: ["œuf", "oeuf", "œufs", "oeufs"],
  sans_soja: ["soja", "tofu", "edamame", "sauce soja", "miso", "tamari"],
  sans_poisson: ["poisson", "thon", "saumon", "cabillaud", "sardine", "anchois", "maquereau"],
  sans_crustaces: ["crevette", "crevettes", "crustacé", "homard", "langouste", "crabe"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0153/g, "oe")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "oe")
    .trim();
}

function isCookingOilIngredientName(line: string): boolean {
  const n = normalize(line).replace(/['’]/g, "");
  return /\bhuile\b/.test(n);
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickWeightedRandom<T>(items: { item: T; weight: number }[]): T | null {
  const total = items.reduce((acc, cur) => acc + Math.max(0, cur.weight), 0);
  if (total <= 0) return items[0]?.item ?? null;
  let cursor = Math.random() * total;
  for (const it of items) {
    cursor -= Math.max(0, it.weight);
    if (cursor <= 0) return it.item;
  }
  return items[items.length - 1]?.item ?? null;
}

function recipeUseCount(usage: Map<number, number>, recipeId: number): number {
  return usage.get(recipeId) || 0;
}

export function maxMinutesForCookingPreference(key: CookingTimeKey): number {
  switch (key) {
    case "moins_15":
      return 15;
    case "15_30":
      return 30;
    case "30_45":
      return 45;
    case "peu_importe":
      return 9999;
    default:
      return 999;
  }
}

export function buildExclusionList(prefs: PlannerPreferences): string[] {
  const out: string[] = [];
  for (const f of prefs.dietary_filters) {
    const list = FILTER_EXCLUSIONS[f];
    if (list) out.push(...list);
  }
  for (const a of prefs.allergy_keys) {
    out.push(a);
  }
  for (const e of prefs.excluded_ingredients) {
    out.push(e);
  }
  return [...new Set(out.map(normalize))].filter(Boolean);
}

/**
 * Exclut toute recette contenant un token d’exclusion (contrainte forte).
 */
export function filterRecipesByStrictExclusions<T extends { ingredients: string | null }>(
  recipes: T[],
  exclusions: string[]
): T[] {
  if (exclusions.length === 0) return recipes;
  return recipes.filter((recipe) => {
    const text = normalize(recipe.ingredients || "");
    for (const ex of exclusions) {
      if (!ex) continue;
      const esc = ex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${esc}\\b`, "i");
      if (re.test(text)) return false;
    }
    return true;
  });
}

export function expandEquipmentKeys(keys: string[]): string[] {
  const set = new Set<string>();
  for (const k of keys) {
    const syn = EQUIPMENT_KEY_SYNONYMS[k] || [k.replace(/_/g, " ")];
    for (const s of syn) set.add(normalize(s));
  }
  return [...set];
}

export function filterRecipesByMaxPrepTime<T extends { temps_preparation_min: number | null }>(
  recipes: T[],
  maxMinutes: number
): T[] {
  if (maxMinutes >= 200) return recipes;
  return recipes.filter((r) => Number(r.temps_preparation_min) <= maxMinutes);
}

function skillMatchesDifficulty(
  skill: CookingSkillLevel,
  difficulte: string
): number {
  const d = normalize(difficulte);
  const facile = d.includes("facile");
  const difficile = d.includes("difficile");
  if (skill === "debutant") {
    if (facile) return 8;
    if (!difficile) return 4;
    return 0;
  }
  if (skill === "intermediaire") {
    if (!difficile) return 6;
    return 3;
  }
  return 6;
}

/**
 * Compteurs intra-semaine permettant un scoring "soft" qui pénalise les
 * répétitions DANS la semaine en cours (en plus des caps durs gérés ailleurs).
 *
 * Tous les champs sont optionnels — si le caller ne les passe pas, le scoring
 * dégrade en simple scoring statique (comportement historique).
 */
export interface WeekCounters {
  /** Compteur d'occurrences déjà sélectionnées dans la semaine, par famille de protéine. */
  protein?: Map<string, number>;
  /** Compteur par main_carb normalisé. */
  carb?: Map<string, number>;
  /** Compteur par main_vegetables (un par légume). */
  vegetables?: Map<string, number>;
  /** Compteur par dish_type normalisé. */
  dish?: Map<string, number>;
}

export function scoreRecipeForPlanner(
  recipe: Recipe,
  season: Season,
  prefs: PlannerPreferences,
  recentFamilyCounts?: Map<string, number>,
  weekCounters?: WeekCounters
): number {
  let score = 50;
  score += skillMatchesDifficulty(prefs.cooking_skill_level, recipe.difficulte || "");

  // Pertinence saison (0–35) : toujours un peu pour éviter les plats très hors-saison.
  const seasonPts = scoreRecipeSeasonRelevance(recipe, season);
  score += prefs.seasonal_preference ? seasonPts : Math.round(seasonPts * 0.35);

  // Pénalités saisonnières renforcées.
  if (prefs.seasonal_preference) {
    if (isExplicitlyWrongSeason(recipe, season)) {
      // Recette explicitement hors-saison (ex. "hiver" en mai) : quasi-exclusion.
      score -= 45;
    } else {
      // "Toute l’année" ou sans tag, mais avec ingrédients typiques de la saison opposée.
      const saison = recipe.saison?.toLowerCase() || "";
      const isAllYear = saison.includes("toute") || saison.includes("annee") || saison.includes("année");
      if (isAllYear || !recipe.saison) {
        const opposites: Season[] = season === "printemps" || season === "été"
          ? ["automne", "hiver"]
          : ["printemps", "été"];
        for (const opp of opposites) {
          if (isRecipeSeasonal(recipe, opp)) { score -= 30; break; } // était -12
        }
      }
    }
  }

  // Scoring doux du temps de préparation (remplace le filtre dur).
  // L’utilisateur exprime une préférence, pas une contrainte absolue.
  const maxMin = maxMinutesForCookingPreference(prefs.cooking_time_preference);
  if (maxMin < 999) {
    const prepTime = Number(recipe.temps_preparation_min);
    if (Number.isFinite(prepTime) && prepTime > 0) {
      if (prepTime <= maxMin) score += 12;
      else if (prepTime <= maxMin * 1.5) score += 4;
      else score -= Math.min(18, Math.round((prepTime - maxMin) / maxMin * 10));
    }
  }

  const ing = normalize(recipe.ingredients || "");
  for (const obj of prefs.objectives) {
    if (obj === "perte_poids") {
      if (/\b(salade|légume|legume|soupe)\b/.test(ing)) score += 4;
      if (recipe.calories != null && recipe.calories < 450) score += 3;
    }
    if (obj === "prise_masse") {
      if (/\b(riz|pâte|pate|quinoa|patate|lentille)\b/.test(ing)) score += 4;
      if (/\b(poulet|bœuf|boeuf|œuf|oeuf|fromage)\b/.test(ing)) score += 3;
    }
    if (obj === "vegetarien_plus") {
      const bad = /\b(poulet|bœuf|boeuf|porc|jambon)\b/.test(ing);
      if (!bad && /\b(légume|legume|pois chiche|lentille)\b/.test(ing)) score += 5;
    }
    if (obj === "gain_temps" || obj === "charge_mentale") {
      if (Number(recipe.temps_preparation_min) <= 25) score += 5;
    }
  }
  if (prefs.dietary_filters.includes("flexitarien")) {
    if (/\b(légume|legume|pois chiche|lentille)\b/.test(ing)) score += 2;
  }
  for (const c of prefs.world_cuisines) {
    if (c && ing.includes(normalize(c))) score += 6;
  }
  const familyKey = normalize((recipe.family || recipe.meal_subtype || recipe.type || "").trim());
  if (recentFamilyCounts && familyKey) {
    const seen = recentFamilyCounts.get(familyKey) || 0;
    if (seen > 0) score -= Math.min(28, seen * 7);
  }

  // ── Pénalité INTRA-SEMAINE (mode "menu varié") ───────────────────────────
  // Cible : décourager les recettes qui répètent une protéine / un féculent /
  // un type de plat / un légume déjà présents dans la semaine en cours.
  // Pénalités progressives : la 2ᵉ occurrence est tolérée, la 3ᵉ devient
  // coûteuse, la 4ᵉ quasiment éliminatoire. Combinées avec les caps durs.
  if (weekCounters) {
    if (weekCounters.protein) {
      for (const p of getMainProteins(recipe)) {
        const seen = weekCounters.protein.get(p) || 0;
        if (seen === 1) score -= 6;
        else if (seen === 2) score -= 18;
        else if (seen >= 3) score -= 40;
      }
    }
    if (weekCounters.carb) {
      const carb = getMainCarb(recipe);
      if (carb && carb !== "sans" && carb !== "aucun") {
        const seen = weekCounters.carb.get(carb) || 0;
        if (seen === 1) score -= 5;
        else if (seen === 2) score -= 16;
        else if (seen >= 3) score -= 35;
      }
    }
    if (weekCounters.vegetables) {
      for (const v of getMainVegetables(recipe)) {
        const seen = weekCounters.vegetables.get(v) || 0;
        if (seen === 1) score -= 3;
        else if (seen >= 2) score -= 10;
      }
    }
    if (weekCounters.dish) {
      const d = getDishType(recipe);
      if (d) {
        const seen = weekCounters.dish.get(d) || 0;
        if (seen === 1) score -= 8;
        else if (seen === 2) score -= 22;
        else if (seen >= 3) score -= 45;
      }
    }
  }

  return score;
}

export interface PlannedMeal {
  meal_type: PlannerMealType;
  recipe_id: number;
  recipe_name: string;
  recipe_payload: Recipe;
  /** UUID partage par tous les creneaux d'un meme batch cooking. */
  batch_group_id?: string | null;
  /** TRUE = creneau ou la preparation est reellement faite, FALSE = reprise. */
  is_batch_origin?: boolean | null;
  /** Nombre total de portions preparees (= household_size * nb_creneaux du batch). */
  batch_servings?: number | null;
  /** Adaptation foyer : scale | batch_portions */
  portion_adaptation?: "scale" | "batch_portions" | null;
  /** Libellé affiché (ex. quantités adaptées pour 2 pers.) */
  portion_note?: string | null;
}

export interface LockedSlot {
  day_index: number;
  meal_type: string;
  recipe_id: number;
  recipe_payload: Recipe;
}

export interface PlannedDay {
  day_index: number;
  day_date: string;
  meals: PlannedMeal[];
}

export interface PlannedWeek {
  days: PlannedDay[];
  meta: {
    season: Season;
    recipes_considered: number;
    recipes_after_filters: number;
  };
}

function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Assignation gloutonne avec pénalité de répétition (variété).
 */
export function buildWeeklyPlan(
  recipes: Recipe[],
  prefs: PlannerPreferences,
  weekStartISO: string,
  recentlyUsed?: Map<number, number>,
  recentFamilyCounts?: Map<string, number>,
  lockedMeals?: LockedSlot[]
): PlannedWeek {
  const season = getCurrentSeason();
  const exclusions = buildExclusionList(prefs);

  // Filtres durs :
  //  1. Règles diététiques structurées (allergens / diet_tags / main_protein)
  //  2. Regex legacy sur ingredients (fallback pour les recettes mal taggées).
  //
  // ⚠️ NB : le filtre `equipement` n'est PLUS appliqué comme contrainte dure.
  // En pratique, la plupart des utilisateurs ne renseignent pas exhaustivement
  // leur cuisine et le filtre éliminait jusqu'à 80% des recettes (toute
  // recette demandant "blender" ou "robot" sautait).
  let pool = filterRecipesByStructuredDietaryRules(
    recipes,
    prefs.dietary_filters,
    prefs.allergy_keys
  );
  pool = filterRecipesByStrictExclusions(pool, exclusions);

  // Filtre saisonnier DUR : quand seasonal_preference est actif, seules les recettes
  // de la saison courante, "toute l'année" ou sans tag entrent dans le pool.
  // Aucune recette hors-saison (hiver en mai, etc.) ne peut apparaître, même en fallback.
  const basePool = prefs.seasonal_preference
    ? filterRecipesForSeasonalPool(pool, season)
    : pool;

  // ── Exclusion `recentlyUsed` PAR CRÉNEAU ───────────────────────────────
  // Ancien comportement : on regardait la taille GLOBALE du pool frais. Si elle
  // était >= 2× minSlotsNeeded, on excluait toutes les recettes récentes.
  // Problème : un pool global de 1700 cache parfaitement un pool breakfast de
  // 0 (toutes les breakfast ont été utilisées dans les 6 derniers menus).
  //
  // Nouveau : on calcule la TAILLE par créneau et on n'applique l'exclusion
  // `recentlyUsed` que pour les créneaux où elle laisse encore assez de marge
  // (≥ 3× planning_days). Sinon on garde toutes les recettes pour ce créneau.
  const recentIds = recentlyUsed ? new Set(recentlyUsed.keys()) : new Set<number>();
  const workingPool: Recipe[] = (() => {
    if (recentIds.size === 0) return basePool;
    const result = new Set<Recipe>();
    for (const mealType of prefs.meal_types) {
      const compatibleAll = basePool.filter((r) =>
        isRecipeCompatibleWithMealType(r, mealType)
      );
      const fresh = compatibleAll.filter((r) => !recentIds.has(r.id));
      // Seuil souple : il faut au moins 3× planning_days recettes fraîches pour
      // ce créneau, sinon on autorise les recettes récentes (le scoring les
      // pénalisera quand même).
      const threshold = prefs.planning_days * 3;
      const chosen = fresh.length >= threshold ? fresh : compatibleAll;
      for (const r of chosen) result.add(r);
    }
    return Array.from(result);
  })();

  console.log(
    `[planner] Tailles pool : recipes=${recipes.length} ` +
      `after_dietary+exclusions+equipment=${pool.length} ` +
      `after_seasonal=${basePool.length} ` +
      `recentlyUsed=${recentIds.size} ` +
      `working=${workingPool.length}`
  );
  // Détail par créneau pour identifier les zones faibles
  const perMealDiagnostic: Record<string, number> = {};
  for (const mt of prefs.meal_types) {
    perMealDiagnostic[mt] = workingPool.filter((r) => isRecipeCompatibleWithMealType(r, mt)).length;
  }
  console.log(`[planner] Compatibles par créneau dans workingPool :`, perMealDiagnostic);

  const scoredRaw = workingPool
    .map((r) => {
      let s = scoreRecipeForPlanner(r, season, prefs, recentFamilyCounts);
      // Pénalité graduelle pour les recettes récemment utilisées. S'applique
      // toujours (pas conditionnel) : si la recette est dans le pool malgré
      // l'historique, c'est qu'on en a besoin, mais on la pénalise.
      if (recentlyUsed) {
        const menusAgo = recentlyUsed.get(r.id);
        if (menusAgo === 0) s = Math.max(0, s - 60);
        else if (menusAgo === 1) s = Math.max(0, s - 35);
        else if (menusAgo === 2) s = Math.max(0, s - 20);
        else if (menusAgo === 3) s = Math.max(0, s - 10);
        else if (menusAgo === 4) s = Math.max(0, s - 5);
      }
      return { r, s };
    })
    .sort((a, b) => b.s - a.s);
  // Bruit d'exploration plus large pour éviter que les mêmes recettes gagnent à chaque tirage.
  const scored = rerankWithMMR(scoredRaw, 0.72).map(({ r, s }) => ({
    r,
    s: s + Math.random() * 45,
  }));

  // Index des slots verrouillés par jour
  const lockedByDay = new Map<number, Map<string, PlannedMeal>>();
  for (const lm of lockedMeals || []) {
    if (!lockedByDay.has(lm.day_index)) lockedByDay.set(lm.day_index, new Map());
    lockedByDay.get(lm.day_index)!.set(lm.meal_type, {
      meal_type: lm.meal_type as PlannerMealType,
      recipe_id: lm.recipe_id,
      recipe_name: lm.recipe_payload.nom_recette || "Recette",
      recipe_payload: lm.recipe_payload,
    });
  }

  const used = new Set<number>();
  const usageCount = new Map<number, number>();
  const weekTagCounts = new Map<string, number>();
  // Compteurs intra-semaine pour pénalité dynamique (mode "menu varié").
  const weekCounters: WeekCounters = {
    protein: new Map<string, number>(),
    carb: new Map<string, number>(),
    vegetables: new Map<string, number>(),
    dish: new Map<string, number>(),
  };
  const days: PlannedDay[] = [];
  const sortedSlots = sortMealTypesForDisplay(prefs.meal_types);
  const totalSlots = prefs.planning_days * sortedSlots.length;

  // Helper : pénalité de variété dynamique pour une recette donnée, en fonction
  // des compteurs intra-semaine au moment du tirage. Renvoie un nombre POSITIF
  // à soustraire au poids.
  const dynamicVarietyPenalty = (r: Recipe): number => {
    let p = 0;
    for (const pr of getMainProteins(r)) {
      const seen = weekCounters.protein!.get(pr) || 0;
      if (seen === 1) p += 6;
      else if (seen === 2) p += 18;
      else if (seen >= 3) p += 40;
    }
    const carb = getMainCarb(r);
    if (carb && carb !== "sans" && carb !== "aucun") {
      const seen = weekCounters.carb!.get(carb) || 0;
      if (seen === 1) p += 5;
      else if (seen === 2) p += 16;
      else if (seen >= 3) p += 35;
    }
    for (const v of getMainVegetables(r)) {
      const seen = weekCounters.vegetables!.get(v) || 0;
      if (seen >= 1) p += 5 * seen;
    }
    const dish = getDishType(r);
    if (dish) {
      const seen = weekCounters.dish!.get(dish) || 0;
      if (seen === 1) p += 8;
      else if (seen === 2) p += 22;
      else if (seen >= 3) p += 45;
    }
    return p;
  };

  const updateWeekCounters = (r: Recipe): void => {
    for (const pr of getMainProteins(r)) {
      weekCounters.protein!.set(pr, (weekCounters.protein!.get(pr) || 0) + 1);
    }
    const carb = getMainCarb(r);
    if (carb && carb !== "sans" && carb !== "aucun") {
      weekCounters.carb!.set(carb, (weekCounters.carb!.get(carb) || 0) + 1);
    }
    for (const v of getMainVegetables(r)) {
      weekCounters.vegetables!.set(v, (weekCounters.vegetables!.get(v) || 0) + 1);
    }
    const dish = getDishType(r);
    if (dish) {
      weekCounters.dish!.set(dish, (weekCounters.dish!.get(dish) || 0) + 1);
    }
  };

  for (let d = 0; d < prefs.planning_days; d++) {
    const dayDominant = new Set<string>();
    const meals: PlannedMeal[] = [];

    // Pré-remplissage des slots verrouillés pour ce jour
    const dayLocked = lockedByDay.get(d);
    if (dayLocked) {
      for (const [mt, lm] of dayLocked) {
        if (!sortedSlots.includes(mt as PlannerMealType)) continue;
        used.add(lm.recipe_id);
        usageCount.set(lm.recipe_id, (usageCount.get(lm.recipe_id) || 0) + 1);
        addRecipeDominantKeys(lm.recipe_payload, dayDominant);
        addRecipeDiversityTags(lm.recipe_payload, weekTagCounts);
        updateWeekCounters(lm.recipe_payload);
        meals.push(lm);
      }
    }
    for (const meal of sortedSlots) {
      // Slot déjà rempli par un verrou → on passe
      if (meals.some((m) => m.meal_type === meal)) continue;

      // Helper : convertit un score en poids final en appliquant la pénalité dynamique.
      const weightFor = (r: Recipe, s: number, reusePenalty = 0): number => {
        let bonus = 0;
        if (meal === "breakfast") {
          bonus += scoreBreakfastPreference(r, prefs.breakfast_preference);
        }
        return Math.max(1, s + bonus - dynamicVarietyPenalty(r) - reusePenalty);
      };

      let picked: Recipe | null = null;
      const primaryCandidates = scored.filter(({ r }) => {
        if (used.has(r.id)) return false;
        if (!isRecipeCompatibleWithMealType(r, meal)) return false;
        if (dominantKeysConflictWithDay(r, dayDominant)) return false;
        if (wouldExceedWeekDiversityCap(r, weekTagCounts, totalSlots)) return false;
        return true;
      });
      if (primaryCandidates.length > 0) {
        // Sélection pondérée sur TOUS les candidats compatibles — aucune troncature.
        // Le score est ajusté dynamiquement par la pénalité intra-semaine.
        picked =
          pickWeightedRandom(
            primaryCandidates.map(({ r, s }) => ({ item: r, weight: weightFor(r, s) }))
          ) ?? null;
      }
      if (!picked) {
        const secondaryCandidates = scored.filter(({ r }) => {
          if (used.has(r.id)) return false;
          if (!isRecipeCompatibleWithMealType(r, meal)) return false;
          if (wouldExceedWeekDiversityCap(r, weekTagCounts, totalSlots)) return false;
          return true;
        });
        if (secondaryCandidates.length > 0) {
          picked =
            pickWeightedRandom(
              secondaryCandidates.map(({ r, s }) => ({ item: r, weight: weightFor(r, s) }))
            ) ?? null;
        }
      }
      if (!picked) {
        const anyRemaining = scored.filter(({ r }) => !used.has(r.id) && isRecipeCompatibleWithMealType(r, meal));
        if (anyRemaining.length > 0) {
          picked =
            pickWeightedRandom(
              anyRemaining.map(({ r, s }) => ({ item: r, weight: weightFor(r, s) }))
            ) ?? null;
        }
      }
      // Réutilisation graduelle: max de variété, semaine toujours complète.
      if (!picked) {
        const reuseWithDominant = scored.filter(({ r }) => {
          if (recipeUseCount(usageCount, r.id) >= 2) return false;
          if (!isRecipeCompatibleWithMealType(r, meal)) return false;
          if (dominantKeysConflictWithDay(r, dayDominant)) return false;
          if (wouldExceedWeekDiversityCap(r, weekTagCounts, totalSlots)) return false;
          return true;
        });
        if (reuseWithDominant.length > 0) {
          picked =
            pickWeightedRandom(
              reuseWithDominant.map(({ r, s }) => ({
                item: r,
                weight: weightFor(r, s, recipeUseCount(usageCount, r.id) * 22),
              }))
            ) ?? reuseWithDominant[0].r;
        }
      }
      if (!picked) {
        const reuseLoose = scored.filter(({ r }) => {
          if (recipeUseCount(usageCount, r.id) >= 3) return false;
          if (!isRecipeCompatibleWithMealType(r, meal)) return false;
          return true;
        });
        if (reuseLoose.length > 0) {
          picked =
            pickWeightedRandom(
              reuseLoose.map(({ r, s }) => ({
                item: r,
                weight: weightFor(r, s, recipeUseCount(usageCount, r.id) * 24),
              }))
            ) ?? reuseLoose[0].r;
        }
      }
      if (!picked && scored.length > 0) {
        picked = shuffleArray(scored)[0].r;
      }
      if (!picked) break;
      used.add(picked.id);
      usageCount.set(picked.id, recipeUseCount(usageCount, picked.id) + 1);
      addRecipeDominantKeys(picked, dayDominant);
      addRecipeDiversityTags(picked, weekTagCounts);
      updateWeekCounters(picked);
      meals.push({
        meal_type: meal,
        recipe_id: picked.id,
        recipe_name: picked.nom_recette || "Recette",
        recipe_payload: picked,
      });
    }
    days.push({
      day_index: d,
      day_date: addDaysISO(weekStartISO, d),
      meals,
    });
  }

  // Pool de secours pour le finalize : on garde TOUS les filtres durs (diététiques,
  // allergènes, équipement) mais on retire le filtre saisonnier ET recentlyUsed.
  // Le finalize l'utilise uniquement si le pool principal n'a rien de compatible
  // pour un créneau — c'est ce qui évite les slots vides à breakfast/snack.
  const fallbackPool = pool;

  return finalizeIncompleteWeeklyPlan(
    {
      days,
      meta: {
        season,
        recipes_considered: recipes.length,
        recipes_after_filters: basePool.length,
      },
    },
    prefs,
    weekStartISO,
    scored,
    fallbackPool
  );
}

/**
 * Garantit `planning_days` jours et tous les créneaux `meal_types`, en complétant avec le catalogue
 * trié par score (réutilisation de recettes autorisée). Idempotent si le plan est déjà complet.
 *
 * @param fallbackPool — pool LARGE (filtres durs seulement, sans saison ni recentlyUsed)
 *                       utilisé EN ULTIME RECOURS quand `scored` n'a aucune recette compatible
 *                       avec un créneau. Permet de ne JAMAIS laisser un slot vide à cause d'un
 *                       filtre saisonnier ou historique trop strict.
 */
export function finalizeIncompleteWeeklyPlan(
  plan: PlannedWeek,
  prefs: PlannerPreferences,
  weekStartISO: string,
  scored: { r: Recipe; s: number }[],
  fallbackPool?: Recipe[]
): PlannedWeek {
  const sortedSlots = sortMealTypesForDisplay(prefs.meal_types);
  const newDays: PlannedDay[] = [];
  const usageCount = new Map<number, number>();
  const weekUsed = new Set<number>();
  const weekTagCounts = new Map<string, number>();
  const totalSlots = prefs.planning_days * sortedSlots.length;

  // Compteurs par créneau de "slots vides faute de candidat compatible"
  // Sert au diagnostic dans les logs serveur.
  const emergencyByMeal: Record<string, number> = {};

  for (let d = 0; d < prefs.planning_days; d++) {
    const existingDay = plan.days[d];
    const bySlot = new Map<PlannerMealType, PlannedMeal>();
    for (const m of existingDay?.meals ?? []) {
      bySlot.set(m.meal_type, m);
    }

    const dayDominant = new Set<string>();
    const dayRecipeIds = new Set<number>();
    const meals: PlannedMeal[] = [];

    // allowReuse=false (défaut) : exclut les recettes déjà utilisées cette semaine.
    // allowReuse=true : dernier recours quand le pool unique est épuisé.
    const chooseCandidate = (meal: PlannerMealType, strictDominant: boolean, allowReuse = false): Recipe | null => {
      const candidates = scored.filter(({ r }) => {
        if (!allowReuse && weekUsed.has(r.id)) return false; // exclusion stricte par défaut
        if (dayRecipeIds.has(r.id)) return false;
        if (!isRecipeCompatibleWithMealType(r, meal)) return false;
        if (strictDominant && dominantKeysConflictWithDay(r, dayDominant)) return false;
        if (wouldExceedWeekDiversityCap(r, weekTagCounts, totalSlots)) return false;
        return true;
      });
      return pickWeightedRandom(
        candidates.map(({ r, s }) => {
          const reuse = recipeUseCount(usageCount, r.id);
          return { item: r, weight: Math.max(1, s - reuse * 28) };
        })
      );
    };

    for (const meal of sortedSlots) {
      const kept = bySlot.get(meal);
      if (kept) {
        const duplicateInWeek = weekUsed.has(kept.recipe_id);
        const duplicateInDay = dayRecipeIds.has(kept.recipe_id);
        // Rejeter aussi les recettes incompatibles avec le créneau (ex. recette dîner en petit-déj)
        const incompatibleType = !isRecipeCompatibleWithMealType(kept.recipe_payload, meal);
        if (!duplicateInWeek && !duplicateInDay && !incompatibleType) {
          addRecipeDominantKeys(kept.recipe_payload, dayDominant);
          dayRecipeIds.add(kept.recipe_id);
          weekUsed.add(kept.recipe_id);
          usageCount.set(kept.recipe_id, recipeUseCount(usageCount, kept.recipe_id) + 1);
          addRecipeDiversityTags(kept.recipe_payload, weekTagCounts);
          meals.push(kept);
          continue;
        }
      }

      // Cascade : unique + strict → unique + souple → reuse + strict → reuse + souple
      let pick: Recipe | null =
        chooseCandidate(meal, true) ??
        chooseCandidate(meal, false) ??
        chooseCandidate(meal, true, true) ??
        chooseCandidate(meal, false, true);

      // Fallback d'urgence : on accepte de RÉUTILISER une recette plusieurs fois,
      // mais JAMAIS de placer une recette incompatible avec le créneau.
      if (!pick && scored.length > 0) {
        const compatible = scored.filter(({ r }) => isRecipeCompatibleWithMealType(r, meal));
        if (compatible.length > 0) {
          const ranked = compatible
            .map(({ r, s }) => ({
              r,
              adjusted:
                (!dayRecipeIds.has(r.id) ? 200 : -1000) +
                (!weekUsed.has(r.id) ? 80 : 0) +
                s -
                recipeUseCount(usageCount, r.id) * 18 +
                Math.random(),
            }))
            .sort((a, b) => b.adjusted - a.adjusted);
          pick = ranked[0]?.r ?? null;
        }
      }

      // ULTIME RECOURS : aucune recette compatible dans le scored pool. On va
      // piocher dans le fallbackPool (filtres durs seulement, pas de saison ni
      // de filtre historique). Mieux vaut une recette légèrement hors-saison ou
      // déjà vue récemment qu'un slot vide.
      if (!pick && fallbackPool && fallbackPool.length > 0) {
        const compatibleFallback = fallbackPool.filter(
          (r) => isRecipeCompatibleWithMealType(r, meal) && !dayRecipeIds.has(r.id)
        );
        if (compatibleFallback.length > 0) {
          // Préférer une recette non utilisée cette semaine, puis aléatoire
          const fresh = compatibleFallback.filter((r) => !weekUsed.has(r.id));
          const pickFrom = fresh.length > 0 ? fresh : compatibleFallback;
          pick = pickFrom[Math.floor(Math.random() * pickFrom.length)];
          emergencyByMeal[meal] = (emergencyByMeal[meal] || 0) + 1;
        }
      }

      if (!pick) {
        console.warn(
          `[planner] Aucune recette compatible avec "${meal}" — slot vide. ` +
            `Vérifier meal_slot dans recipes_v2 et les filtres utilisateur.`
        );
        continue;
      }

      addRecipeDominantKeys(pick, dayDominant);
      dayRecipeIds.add(pick.id);
      weekUsed.add(pick.id);
      usageCount.set(pick.id, recipeUseCount(usageCount, pick.id) + 1);
      addRecipeDiversityTags(pick, weekTagCounts);
      meals.push({
        meal_type: meal,
        recipe_id: pick.id,
        recipe_name: pick.nom_recette || "Recette",
        recipe_payload: pick,
      });
    }

    newDays.push({
      day_index: d,
      day_date: addDaysISO(weekStartISO, d),
      meals: sortMealsByDisplayOrder(meals),
    });
  }

  // Logging diagnostic : on peut voir dans les logs combien de slots ont nécessité
  // le pool de secours (donc filtres saison/historique probablement trop stricts).
  if (Object.keys(emergencyByMeal).length > 0) {
    console.log(
      `[planner] Pool de secours utilisé pour : ${JSON.stringify(emergencyByMeal)} ` +
        `(scored=${scored.length}, fallback=${fallbackPool?.length ?? 0})`
    );
  }

  return {
    ...plan,
    days: newDays,
  };
}

export interface GroceryListItemDraft {
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategorySlug;
  source_recipe_ids: number[];
}

export function inferGroceryCategory(line: string): GroceryCategorySlug {
  const n = normalize(line);

  // Épices & condiments — liste étendue (les câpres → épicerie salée)
  if (
    /\b(sel\b|poivre|curry|cumin|paprika|piment|coriandre|gingembre|bouillon|moutarde|ketchup|mayonnaise|wasabi|sauce soja|sauce worcestershire|miso|harissa|tabasco|nuoc mam|nuoc-mam|herbes de provence|thym|romarin|laurier|cannelle|muscade|noix de muscade|persil|basilic|menthe|ciboulette|estragon|cerfeuil|origan|aneth|safran|quatre epices|cardamome|clou de girofle|girofle|fenugrec|pate de curry|relish|cornichon|zaatar|ras el hanout|epice|assaisonnement|herbe|aromate|fleur de sel|sel de mer|poivre noir|poivre blanc|piment d'espelette)\b/.test(n)
  )
    return "epices_condiments";
  if (/\b(vinaigre|vinaigrette|citron\b|citrons|jus de citron|jus d'orange|lime)\b/.test(n)) return "epices_condiments";
  if (/\bhuile\b/.test(n)) return "epices_condiments";

  // Épicerie salée
  if (/\b(lait de coco|creme de coco|conserve|boite de|concentre de tomates|double concentre|coulis de tomates|tomates en boite|tomates pelees|pulpe de tomates|sauce tomate|bouillon de|fond de|fumet)\b/.test(n)) return "epicerie_salee";
  if (
    /\b(farine|maizena|levure|bicarbonate|vinaigre balsamique|sauce|moutarde|ketchup|tamari|worcestershire|nuoc|tabasco|eau gazeuse|eau minerale|eau\b|capres?|olives?\s+noires?|tapenade|pignons?(\s+de\s+pin|\s+pin)?|cacahuetes?)\b/.test(n)
  )
    return "epicerie_salee";

  // Fruits & légumes — liste très étendue
  if (
    /\b(tomates?|carottes?|salades?|laitues?|roquette|epinards?|chou\b|courgettes?|aubergines?|poivrons?|oignons?|oignon\s+rouge|oignon\s+blanc|ail\b|echalotes?|poireaux?|celeris?|fenouils?|asperges?|brocolis?|chou-fleur|choux?-?fleurs?|artichauts?|betteraves?|radis|navets?|potirons?|courges?|butternuts?|petits?\s+pois|haricots?\s+verts?|feves?|champignons?|girolles?|ceps?|morilles?|truffes?|pommes?\b(?!\s+de\s+terre)|poires?|bananes?|oranges?|clementines?|kiwis?|raisins?|fraises?|framboises?|myrtilles?|cerises?|peches?|nectarines?|abricots?|prunes?|figues?|dattes?|ananas|mangues?|avocats?|melons?|pasteques?|concombres?|mais\b|endives?|cressons?|blettes?|bettes?|rutabagas?|topinambours?|ignames?|maniocs?|taros?|papayes?|grenades?|litchis?|caramboles?|goyaves?|passions?|physalis|sureau|baies?|airelles?|canneberges?|groseilles?|mures?\b|noix de coco\b|citron vert|pamplemousse|kumquat)\b/.test(n)
  )
    return "fruits_legumes";

  // Produits laitiers — étendu
  if (
    /\b(lait\b|yaourt|yogourt|fromage|fromage blanc|fromage frais|creme fraiche|creme liquide|creme\b|beurre|mozzarella|parmesan|emmental|cheddar|feta|ricotta|mascarpone|burrata|halloumi|pecorino|comte|chevre|reblochon|camembert|brie\b|roquefort|gruyere|raclette|munster|beaufort|saint-nectaire|gouda|edam|mimolette|tomme|lait de vache|lait de brebis|lait d'amande|lait de soja|lait d'avoine|lait vegetal|creme vegetal|cream\s+cheese|philadelphia|skyr|faisselle)\b/.test(n)
  )
    return "produits_laitiers";

  // Protéines — étendu
  if (
    /\b(poulet|dinde|canard|boeuf|porc|veau|agneau|mouton|lapin|gibier|jambon|lardons|bacon|saucisse|chorizo|merguez|andouille|chipolata|boudin|pate de campagne|rillette|saumon|thon|cabillaud|maquereau|sardine|anchois|crevette|moule\b|calamar|poulpe|bar\b|daurade|dorade|truite|lieu|merlu|sole\b|turbot|langoustine|homard|langouste|crabe|seiche|palourde|huitre|morue|stockfish|surimi|tofu|tempeh|seitan|proteine|viande|filet|escalope|blanquette|boulette|hache|steak|roti\b|cuisse|aile\b|pilon|lardon|jambon cru|jambon cuit|oeufs?)\b/.test(n)
  )
    return "proteines";

  // Épicerie sucrée
  if (
    /\b(sucre\b|cassonade|vergeoise|chocolat\b|praline|nutella|pate a tartiner|confiture|miel|sirop d'erable|sirop d agave|sirop\b|vanille|extrait de vanille|pepites|cacao|poudre de cacao|noix de coco rapee|raisins secs|fruits secs|abricot sec|figue seche|pruneau|datte|cranberry|chips de|cookie|biscuit|gateau|cake|madeleine|cereale|muesli|granola|flocon d'avoine)\b/.test(n)
  )
    return "epicerie_sucree";

  // Féculents — étendu
  if (
    /\b(pates\b|nouilles|spaghetti|pennes?|penne|linguine|coquillettes?|tagliatelle|fusilli|rigatoni|lasagne|gnocchi|riz\b|riz basmati|riz complet|riz arborio|quinoa|boulgour|semoule|couscous|polenta|avoine|lentilles?|pois\s+chiches?|pois chiche|haricots?\s+blancs?|haricots?\s+rouges?|flageolets?|pain\b|pain de mie|pain complet|baguette|bagels?|brioche|brioches?|pain au lait|tortillas?|wrap|galette|crackers|biscottes|chapelure|panure|fecule|pommes?\s+de\s+terre|patates?\s+douces?)\b/.test(n)
  )
    return "feculents";

  // Boissons → épicerie salée
  if (/\b(vin\b|cidre|biere\b|soda\b|jus\b|sirop de|bouteille)\b/.test(n)) return "epicerie_salee";

  return "autres";
}

const QTY_RE = /^([\d.,]+)\s*([a-zA-Zàâäéèêëïîôùûüç%]+)?\s+(.+)$/;
const QTY_END_RE = /^(.+?)\s+([\d.,]+)\s*([a-zA-Zàâäéèêëïîôùûüç%]+)?$/;

function parseIngredientLine(raw: string): {
  name: string;
  quantity: number | null;
  unit: string | null;
} {
  const t = raw.trim();
  if (!t) return { name: "", quantity: null, unit: null };
  let m = t.match(QTY_RE);
  if (m) {
    const q = parseFloat(m[1].replace(",", "."));
    return {
      name: m[3].trim(),
      quantity: Number.isFinite(q) ? q : null,
      unit: m[2]?.trim() || null,
    };
  }
  m = t.match(QTY_END_RE);
  if (m) {
    const q = parseFloat(m[2].replace(",", "."));
    return {
      name: m[1].trim(),
      quantity: Number.isFinite(q) ? q : null,
      unit: m[3]?.trim() || null,
    };
  }
  return { name: t, quantity: null, unit: null };
}

function normalizeIngredientKey(name: string): string {
  return normalizeIngredientNameForMerge(name);
}

/**
 * Clé de fusion : nom canonique, avec séparation frais / conserve pour les tomates
 * afin de ne pas additionner tomates cerises et tomates pelées en boîte.
 */
function groceryListMergeKey(ingredientName: string): string {
  const nk = normalizeIngredientKey(ingredientName);
  const n = normalize(ingredientName).replace(/['’]/g, "");
  if (nk === "thon") {
    if (
      /\b(thon rouge|thon frais|sashimi|tartare|carpaccio|mi.?cuit|steak de thon|filet de thon|pave de thon|pavé de thon)\b/.test(
        n
      )
    ) {
      return `${nk}#frais`;
    }
    return `${nk}#conserve`;
  }
  if (nk === "tomate" || nk === "tomate cerise") {
    if (
      /\b(conserve|boite|boites|boîte|boîtes|bocal|concentre|double concentre|pelees|pelee|couli|sauce tomate|pulpe|pelées|pelée)\b/.test(
        n
      )
    ) {
      return `${nk}#conserve`;
    }
    return `${nk}#frais`;
  }
  return nk;
}

/** c.à.s. / c.à.c. → g ou ml (liste de courses lisible, sans petites mesures). */
function convertSpoonsForGroceryList(parsed: ParsedIngredient): ParsedIngredient {
  if (parsed.canonicalUnit !== "tbsp" || parsed.canonicalQuantity == null) return parsed;
  if (inferGroceryCategory(parsed.name) === "epices_condiments") {
    if (isCookingOilIngredientName(parsed.name)) {
      /* huiles : garder la conversion c.à.s. → ml */
    } else {
      return { ...parsed, canonicalQuantity: null, canonicalUnit: null };
    }
  }
  const n = normalize(parsed.name).replace(/['’]/g, "");
  if (
    /\b(huile|vinaigre|sauce soja|nuoc|tamari|lait\b|creme liquide|jus\b|eau\b|vin\b|porto|sherry|liqueur|mayonnaise|ketchup)\b/.test(
      n
    )
  ) {
    return { ...parsed, canonicalUnit: "ml", canonicalQuantity: parsed.canonicalQuantity * 15 };
  }
  if (/\b(miel|sirop|confiture|nutella|cacao|melasse)\b/.test(n)) {
    return { ...parsed, canonicalUnit: "g", canonicalQuantity: parsed.canonicalQuantity * 20 };
  }
  if (/\b(farine|sucre|maizena|fecule|chapelure|levure chimique|bicarbonate|semoule)\b/.test(n)) {
    return { ...parsed, canonicalUnit: "g", canonicalQuantity: parsed.canonicalQuantity * 10 };
  }
  return { ...parsed, canonicalUnit: "ml", canonicalQuantity: parsed.canonicalQuantity * 15 };
}

const CANNED_FISH_G: Record<string, number> = {
  thon: 130,
  sardine: 85,
  maquereau: 180,
};

function groceryMergeUnitKind(raw: string | null): "g" | "ml" | "piece" | "other" {
  if (!raw) return "other";
  const disp = displayUnitForStorage(raw) || raw;
  const nu = normalizeGroceryUnit(disp);
  if (nu === "g") return "g";
  if (nu === "ml") return "ml";
  if (nu === "piece") return "piece";
  const low = String(raw).toLowerCase();
  if (/\b(boite|boîte|conserve|pot|brique)\b/.test(low)) return "piece";
  return "other";
}

function mergeTwoQuantities(
  mergeKey: string,
  q1: number,
  u1: string | null,
  q2: number,
  u2: string | null
): { qty: number; unitRaw: string | null } | null {
  const nk = mergeKey.includes("#") ? mergeKey.split("#")[0]! : mergeKey;
  const k1 = groceryMergeUnitKind(u1);
  const k2 = groceryMergeUnitKind(u2);
  if (k1 === k2 && k1 !== "other") {
    return { qty: q1 + q2, unitRaw: u1 };
  }
  let perCan: number | undefined = CANNED_FISH_G[nk as keyof typeof CANNED_FISH_G];
  if (nk === "thon" && mergeKey.endsWith("#frais")) perCan = undefined;
  if (perCan) {
    const g1 = k1 === "g" ? q1 : k1 === "piece" ? q1 * perCan : null;
    const g2 = k2 === "g" ? q2 : k2 === "piece" ? q2 * perCan : null;
    if (g1 != null && g2 != null) {
      return { qty: g1 + g2, unitRaw: "g" };
    }
  }
  return null;
}

function prettyGroceryNameFromMergeKey(mergeKey: string): string {
  const nk = mergeKey.includes("#") ? mergeKey.split("#")[0]! : mergeKey;
  const overrides: Record<string, string> = {
    thon: mergeKey.includes("thon#frais") ? "Thon" : "Thon en conserve",
    sardine: "Sardines en conserve",
    maquereau: "Maquereau en conserve",
    saumon: "Saumon",
    poulet: "Poulet",
    carotte: "Carotte",
    tomate: "Tomates",
    "tomate cerise": "Tomates cerises",
    oignon: "Oignon",
    "oignon rouge": "Oignon rouge",
    "oignon blanc": "Oignon blanc",
    "pomme de terre": "Pomme de terre",
    courgette: "Courgette",
    "fromage blanc": "Fromage blanc",
    "huile olive": "Huile d'olive",
    "huile tournesol": "Huile de tournesol",
    "huile colza": "Huile de colza",
    "huile neutre": "Huile neutre",
    "huile sesame": "Huile de sésame",
  };
  if (overrides[nk]) return sanitizeGroceryIngredientName(overrides[nk]!);
  const built = nk
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return sanitizeGroceryIngredientName(built);
}

function pickBetterGroceryCategory(a: GroceryCategorySlug, b: GroceryCategorySlug): GroceryCategorySlug {
  if (a === b) return a;
  if (a === "epices_condiments" || b === "epices_condiments") return "epices_condiments";
  if (
    (a === "fruits_legumes" && b === "epicerie_salee") ||
    (b === "fruits_legumes" && a === "epicerie_salee")
  ) {
    return "epicerie_salee";
  }
  return a;
}

function finalizeGroceryDrafts(items: GroceryListItemDraft[]): GroceryListItemDraft[] {
  for (const d of items) {
    d.ingredient_name = sanitizeGroceryIngredientName(d.ingredient_name);
    if (d.category === "epices_condiments") {
      if (!isCookingOilIngredientName(d.ingredient_name)) {
        d.quantity = null;
        d.unit = null;
        d.ingredient_name = stripEpicesCondimentsLabel(d.ingredient_name);
      }
      continue;
    }
    const nk = normalizeIngredientKey(d.ingredient_name);
    if ((nk === "thon" || nk === "sardine" || nk === "maquereau") && d.quantity != null && d.quantity > 0) {
      if (nk === "thon" && /\b(thon rouge|frais|sashimi|tartare|filet|steak|pave|pavé)\b/i.test(d.ingredient_name)) {
        continue;
      }
      const per = CANNED_FISH_G[nk] ?? 130;
      if (groceryMergeUnitKind(d.unit) === "g") {
        const cans = Math.max(1, Math.ceil(d.quantity / per));
        d.quantity = cans;
        d.unit = null;
        if (nk === "thon") d.ingredient_name = "Thon en conserve";
        else if (nk === "sardine") d.ingredient_name = "Sardines en conserve";
        else d.ingredient_name = "Maquereau en conserve";
      }
    }
  }
  return items.filter((d) => d.ingredient_name.trim().length > 0);
}

export function buildGroceryFromPlan(
  plan: PlannedWeek,
  householdSize: number
): GroceryListItemDraft[] {
  const map = new Map<
    string,
    { draft: GroceryListItemDraft; qty: number | null; unitRaw: string | null; mergeKey: string }
  >();

  for (const day of plan.days) {
    for (const m of day.meals) {
      // Batch cooking : si le créneau est une "reprise" (is_batch_origin === false),
      // les ingrédients sont déjà comptés sur le créneau d'origine. On skip
      // pour ne pas dupliquer les courses.
      if (m.batch_group_id && m.is_batch_origin === false) {
        continue;
      }

      const r = m.recipe_payload;
      // Pour un créneau "origin" d'un batch, on doit multiplier les
      // ingrédients par le nombre total de créneaux servis, pas juste 1 fois
      // le foyer. batch_servings contient déjà ce total.
      const effectivePortions =
        m.batch_group_id && m.is_batch_origin && m.batch_servings
          ? m.batch_servings
          : householdSize;
      const factor = getScalingFactor(r, effectivePortions);
      const parts = (r.ingredients || "").split(";").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        let parsed = scaleIngredientQuantity(parseIngredientWithUnits(part), factor);
        parsed = convertSpoonsForGroceryList(parsed);
        if (!parsed.name) continue;
        const displayLine = formatScaledIngredient(parsed);
        const mergeKey = groceryListMergeKey(parsed.name);
        const key = mergeKey;
        const existing = map.get(key);
        const cat = inferGroceryCategory(parsed.name);
        const pretty = prettyGroceryNameFromMergeKey(mergeKey);
        if (!pretty.trim()) continue;
        const unitCanon = parsed.canonicalUnit || parsed.unit;
        const unitStored = displayUnitForStorage(unitCanon);

        if (!existing) {
          map.set(key, {
            mergeKey,
            draft: {
              ingredient_name: pretty,
              quantity: parsed.canonicalQuantity,
              unit: unitStored,
              category: cat,
              source_recipe_ids: [r.id],
            },
            qty: parsed.canonicalQuantity,
            unitRaw: unitCanon,
          });
        } else {
          if (!existing.draft.source_recipe_ids.includes(r.id)) {
            existing.draft.source_recipe_ids.push(r.id);
          }
          existing.draft.category = pickBetterGroceryCategory(existing.draft.category, cat);
          existing.draft.ingredient_name = prettyGroceryNameFromMergeKey(existing.mergeKey);

          const qNew = parsed.canonicalQuantity;
          const uNew = unitCanon;
          if (qNew == null) {
            /* garder l'existant */
          } else if (existing.qty == null) {
            existing.qty = qNew;
            existing.draft.quantity = qNew;
            existing.unitRaw = uNew;
            existing.draft.unit = unitStored;
          } else {
            const merged = mergeTwoQuantities(
              mergeKey,
              existing.qty,
              existing.unitRaw,
              qNew,
              uNew
            );
            if (merged) {
              existing.qty = merged.qty;
              existing.draft.quantity = merged.qty;
              existing.unitRaw = merged.unitRaw;
              existing.draft.unit = displayUnitForStorage(merged.unitRaw);
            } else {
              const sameKind =
                normalizeGroceryUnit(displayUnitForStorage(existing.unitRaw) || existing.unitRaw) ===
                normalizeGroceryUnit(unitStored || uNew);
              if (sameKind) {
                existing.qty = existing.qty + qNew;
                existing.draft.quantity = existing.qty;
              } else if (!existing.draft.ingredient_name.includes(parsed.name)) {
                existing.draft.ingredient_name = `${existing.draft.ingredient_name} + ${displayLine}`;
              }
            }
          }
        }
      }
    }
  }

  return finalizeGroceryDrafts([...map.values()].map((v) => v.draft));
}

export function mergePlannerPreferences(
  base: PlannerPreferences,
  override: PlannerGenerateInput
): PlannerPreferences {
  return {
    cooking_time_preference:
      override.cooking_time_preference ?? base.cooking_time_preference,
    household_size: override.household_size ?? base.household_size,
    recipe_scaling_portions:
      override.recipe_scaling_portions !== undefined
        ? override.recipe_scaling_portions
        : base.recipe_scaling_portions,
    adults_count: override.adults_count ?? base.adults_count,
    children_count: override.children_count ?? base.children_count,
    planning_days: override.planning_days ?? base.planning_days,
    meal_types: override.meal_types ?? base.meal_types,
    meal_structure: override.meal_structure ?? base.meal_structure,
    objectives: override.objectives ?? base.objectives,
    custom_goal: override.custom_goal !== undefined ? override.custom_goal : base.custom_goal,
    dietary_filters: override.dietary_filters ?? base.dietary_filters,
    cooking_skill_level: override.cooking_skill_level ?? base.cooking_skill_level,
    world_cuisines: override.world_cuisines ?? base.world_cuisines,
    seasonal_preference: override.seasonal_preference ?? base.seasonal_preference,
    breakfast_preference: override.breakfast_preference ?? base.breakfast_preference,
    equipment_keys: override.equipment_keys ?? base.equipment_keys,
    allergy_keys: override.allergy_keys ?? base.allergy_keys,
    excluded_ingredients: override.excluded_ingredients ?? base.excluded_ingredients,
  };
}

export const DEFAULT_PLANNER_PREFERENCES: PlannerPreferences = {
  cooking_time_preference: "15_30",
  cooking_skill_level: "intermediaire",
  household_size: 2,
  recipe_scaling_portions: null,
  adults_count: 2,
  children_count: 0,
  planning_days: 7,
  meal_types: ["lunch", "dinner"],
  meal_structure: "plat_seul",
  objectives: ["mieux_manger"],
  custom_goal: null,
  dietary_filters: [],
  world_cuisines: [],
  seasonal_preference: true,
  breakfast_preference: "both",
  equipment_keys: ["four", "plaque_cuisson", "refrigerateur"],
  allergy_keys: [],
  excluded_ingredients: [],
};
