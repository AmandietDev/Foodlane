import type { Recipe } from "./recipes";
import { filterRecipesByEquipment } from "./dietaryProfiles";
import {
  displayUnitForStorage,
  normalizeGroceryUnit,
  type GroceryCategorySlug,
} from "./groceryFormat";
import { getCurrentSeason, isRecipeSeasonal, type Season } from "./seasonalFilter";
import { sortMealTypesForDisplay } from "./mealOrder";
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
import {
  formatScaledIngredient,
  getScalingFactor,
  normalizeIngredientNameForMerge,
  parseIngredientLine as parseIngredientWithUnits,
  scaleIngredientQuantity,
} from "./ingredientQuantities";

export type GroceryCategory = GroceryCategorySlug;

export interface PlannerPreferences {
  cooking_time_preference: CookingTimeKey;
  cooking_skill_level: CookingSkillLevel;
  household_size: number;
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
    .trim();
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

export function scoreRecipeForPlanner(
  recipe: Recipe,
  season: Season,
  prefs: PlannerPreferences
): number {
  let score = 50;
  score += skillMatchesDifficulty(prefs.cooking_skill_level, recipe.difficulte || "");
  if (prefs.seasonal_preference && isRecipeSeasonal(recipe, season)) {
    score += 25;
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
  return score;
}

function preferSweetForMeal(meal: PlannerMealType): boolean {
  return meal === "breakfast" || meal === "snack";
}

function isSavoryRecipe(r: Recipe): boolean {
  const t = normalize(r.type || "");
  return t.includes("sale") || t.includes("salé") || (!t.includes("sucre") && !t.includes("sucré"));
}

function isSweetRecipe(r: Recipe): boolean {
  const t = normalize(r.type || "");
  return t.includes("sucre") || t.includes("sucré");
}

export interface PlannedMeal {
  meal_type: PlannerMealType;
  recipe_id: number;
  recipe_name: string;
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
  weekStartISO: string
): PlannedWeek {
  const season = getCurrentSeason();
  const maxMin = maxMinutesForCookingPreference(prefs.cooking_time_preference);
  const exclusions = buildExclusionList(prefs);
  const equipStrings = expandEquipmentKeys(prefs.equipment_keys);

  let pool = filterRecipesByStrictExclusions(recipes, exclusions);
  const afterEx = pool.length;
  pool = filterRecipesByMaxPrepTime(pool, maxMin);
  if (equipStrings.length > 0) {
    pool = filterRecipesByEquipment(pool, equipStrings);
  }

  const scored = pool
    .map((r) => ({ r, s: scoreRecipeForPlanner(r, season, prefs) }))
    .sort((a, b) => b.s - a.s);

  const used = new Set<number>();
  const days: PlannedDay[] = [];
  const sortedSlots = sortMealTypesForDisplay(prefs.meal_types);

  for (let d = 0; d < prefs.planning_days; d++) {
    const dayDominant = new Set<string>();
    const meals: PlannedMeal[] = [];
    for (const meal of sortedSlots) {
      const wantSweet = preferSweetForMeal(meal);
      let picked: Recipe | null = null;
      const primaryCandidates = scored.filter(({ r }) => {
        if (used.has(r.id)) return false;
        if (wantSweet && isSavoryRecipe(r) && !isSweetRecipe(r)) return false;
        if (!wantSweet && isSweetRecipe(r) && meal !== "snack") return false;
        if (dominantKeysConflictWithDay(r, dayDominant)) return false;
        return true;
      });
      if (primaryCandidates.length > 0) {
        // Mélange contrôlé : tirage pondéré parmi le top pour éviter "toujours les mêmes".
        const top = primaryCandidates.slice(0, Math.min(10, primaryCandidates.length));
        const randomizedTop = shuffleArray(top);
        picked =
          pickWeightedRandom(
            randomizedTop.map(({ r, s }, idx) => ({
              item: r,
              weight: Math.max(1, (top.length - idx) * 1.2 + s / 12),
            }))
          ) ?? null;
      }
      if (!picked) {
        const secondaryCandidates = scored.filter(({ r }) => {
          if (used.has(r.id)) return false;
          if (wantSweet && isSavoryRecipe(r) && !isSweetRecipe(r)) return false;
          if (!wantSweet && isSweetRecipe(r) && meal !== "snack") return false;
          return true;
        });
        if (secondaryCandidates.length > 0) {
          const top = secondaryCandidates.slice(0, Math.min(12, secondaryCandidates.length));
          const randomizedTop = shuffleArray(top);
          picked =
            pickWeightedRandom(
              randomizedTop.map(({ r, s }, idx) => ({
                item: r,
                weight: Math.max(1, (top.length - idx) + s / 14),
              }))
            ) ?? null;
        }
      }
      if (!picked) {
        const anyRemaining = scored.filter(({ r }) => !used.has(r.id));
        if (anyRemaining.length > 0) {
          const randomized = shuffleArray(anyRemaining).slice(0, Math.min(15, anyRemaining.length));
          picked =
            pickWeightedRandom(
              randomized.map(({ r, s }, idx) => ({
                item: r,
                weight: Math.max(1, (randomized.length - idx) * 0.8 + s / 18),
              }))
            ) ?? null;
        }
      }
      if (!picked) break;
      used.add(picked.id);
      addRecipeDominantKeys(picked, dayDominant);
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

  return {
    days,
    meta: {
      season,
      recipes_considered: recipes.length,
      recipes_after_filters: pool.length,
    },
  };
}

export interface GroceryListItemDraft {
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategorySlug;
  source_recipe_ids: number[];
}

function inferCategory(line: string): GroceryCategorySlug {
  const n = normalize(line);

  // Épices & condiments — liste étendue
  if (
    /\b(sel\b|poivre|curry|cumin|paprika|piment|coriandre|gingembre|bouillon|moutarde|ketchup|mayonnaise|wasabi|sauce soja|sauce worcestershire|miso|harissa|tabasco|nuoc mam|nuoc-mam|herbes de provence|thym|romarin|laurier|cannelle|muscade|noix de muscade|persil|basilic|menthe|ciboulette|estragon|cerfeuil|origan|aneth|safran|quatre epices|cardamome|clou de girofle|girofle|fenugrec|pate de curry|relish|cornichon|capre|zaatar|ras el hanout|epice|assaisonnement|herbe|aromate|fleur de sel|sel de mer|poivre noir|poivre blanc|piment d'espelette)\b/.test(n)
  )
    return "epices_condiments";
  if (/\b(vinaigre|vinaigrette|citron\b|citrons|jus de citron|jus d'orange|lime)\b/.test(n)) return "epices_condiments";

  // Épicerie salée
  if (/\b(lait de coco|creme de coco|conserve|boite de|concentre de tomates|double concentre|coulis de tomates|tomates en boite|tomates pelees|pulpe de tomates|sauce tomate|bouillon de|fond de|fumet)\b/.test(n)) return "epicerie_salee";
  if (/\b(farine|maizena|levure|bicarbonate|huile\b|huile d'olive|huile de tournesol|huile de sesame|huile de coco|huile de colza|vinaigre balsamique|sauce|moutarde|ketchup|tamari|worcestershire|nuoc|tabasco|eau gazeuse|eau minerale|eau\b)\b/.test(n)) return "epicerie_salee";

  // Fruits & légumes — liste très étendue
  if (
    /\b(tomate|carotte|salade|laitue|roquette|epinard|chou\b|courgette|aubergine|poivron|oignon|ail\b|echalote|poireau|celeri|fenouil|asperge|brocoli|chou-fleur|artichaut|betterave|radis|navet|pomme de terre|patate douce|potiron|courge|butternut|petit pois|haricot vert|feve|champignon|girolle|cep\b|morille|truffe|pomme\b|poire\b|banane|orange|clementine|kiwi|raisin|fraise|framboise|myrtille|cerise|peche|nectarine|abricot|prune|figue|datte|ananas|mangue|avocat|melon|pasteque|concombre|mais\b|artichaut|endive|cresson|blette|bette|navet|rutabaga|topinambour|igname|manioc|taro|papaye|grenade|litchi|carambole|goyave|passion|physalis|sureau|baie|airelle|canneberge|groseille|mure\b|noix de coco\b|citron vert|pamplemousse|kumquat)\b/.test(n)
  )
    return "fruits_legumes";

  // Produits laitiers — étendu
  if (
    /\b(lait\b|yaourt|yogourt|fromage|fromage blanc|fromage frais|creme fraiche|creme liquide|creme\b|beurre|mozzarella|parmesan|emmental|cheddar|feta|ricotta|mascarpone|burrata|comte|chevre|reblochon|camembert|brie\b|roquefort|gruyere|raclette|munster|beaufort|saint-nectaire|gouda|edam|mimolette|tomme|lait de vache|lait de brebis|lait d'amande|lait de soja|lait d'avoine|lait vegetal|creme vegetal|oeufs\b|oeuf\b)\b/.test(n)
  )
    return "produits_laitiers";

  // Protéines — étendu
  if (
    /\b(poulet|dinde|canard|boeuf|porc|veau|agneau|mouton|lapin|gibier|jambon|lardons|bacon|saucisse|chorizo|merguez|andouille|chipolata|boudin|pate de campagne|rillette|saumon|thon|cabillaud|maquereau|sardine|anchois|crevette|moule\b|calamar|poulpe|bar\b|daurade|dorade|truite|lieu|merlu|sole\b|turbot|langoustine|homard|langouste|crabe|seiche|palourde|huitre|morue|stockfish|surimi|tofu|tempeh|seitan|proteine|viande|filet|escalope|blanquette|boulette|hache|steak|roti\b|cuisse|aile\b|pilon|lardon|jambon cru|jambon cuit)\b/.test(n)
  )
    return "proteines";

  // Épicerie sucrée
  if (
    /\b(sucre\b|cassonade|vergeoise|chocolat\b|praline|nutella|pate a tartiner|confiture|miel|sirop d'erable|sirop d agave|sirop\b|vanille|extrait de vanille|pepites|cacao|poudre de cacao|noix de coco rapee|raisins secs|fruits secs|abricot sec|figue seche|pruneau|datte|cranberry|chips de|cookie|biscuit|gateau|cake|madeleine|brioche|pain au lait|cereale|muesli|granola|flocon d'avoine)\b/.test(n)
  )
    return "epicerie_sucree";

  // Féculents — étendu
  if (
    /\b(pates\b|nouilles|spaghetti|penne|tagliatelle|fusilli|rigatoni|lasagne|gnocchi|riz\b|riz basmati|riz complet|riz arborio|quinoa|boulgour|semoule|couscous|polenta|avoine|lentille|pois chiche|haricot blanc|haricot rouge|flageolet|pain\b|pain de mie|pain complet|baguette|tortilla|wrap|galette|crackers|biscottes|chapelure|panure|fecule)\b/.test(n)
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
 * Agrège les ingrédients du plan (déduplication par nom normalisé).
 */
function groceryMergeKey(name: string, unit: string | null): string {
  const nk = normalizeIngredientKey(name);
  const nu = normalizeGroceryUnit(unit);
  return `${nk}\u0001${nu ?? "piece"}`;
}

export function buildGroceryFromPlan(
  plan: PlannedWeek,
  householdSize: number
): GroceryListItemDraft[] {
  const map = new Map<
    string,
    { draft: GroceryListItemDraft; qty: number | null; unitRaw: string | null }
  >();

  for (const day of plan.days) {
    for (const m of day.meals) {
      const r = m.recipe_payload;
      const factor = getScalingFactor(r, householdSize);
      const parts = (r.ingredients || "").split(";").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const parsed = scaleIngredientQuantity(parseIngredientWithUnits(part), factor);
        if (!parsed.name) continue;
        const displayLine = formatScaledIngredient(parsed);
        const key = groceryMergeKey(parsed.name, parsed.canonicalUnit || parsed.unit);
        const existing = map.get(key);
        const cat = inferCategory(parsed.name);
        if (!existing) {
          map.set(key, {
            draft: {
              ingredient_name: parsed.name,
              quantity: parsed.canonicalQuantity,
              unit: displayUnitForStorage(parsed.canonicalUnit || parsed.unit),
              category: cat,
              source_recipe_ids: [r.id],
            },
            qty: parsed.canonicalQuantity,
            unitRaw: parsed.canonicalUnit || parsed.unit,
          });
        } else {
          if (!existing.draft.source_recipe_ids.includes(r.id)) {
            existing.draft.source_recipe_ids.push(r.id);
          }
          const sameUnitKind =
            normalizeGroceryUnit(parsed.canonicalUnit || parsed.unit) === normalizeGroceryUnit(existing.unitRaw);
          if (sameUnitKind && parsed.canonicalQuantity != null && existing.qty != null) {
            existing.draft.quantity = existing.qty + parsed.canonicalQuantity;
            existing.qty = existing.draft.quantity;
          } else if (parsed.canonicalQuantity != null && existing.qty == null) {
            existing.draft.quantity = parsed.canonicalQuantity;
            existing.qty = parsed.canonicalQuantity;
            existing.draft.unit = displayUnitForStorage(parsed.canonicalUnit || parsed.unit);
            existing.unitRaw = parsed.canonicalUnit || parsed.unit;
          }
          if ((parsed.canonicalUnit || parsed.unit) && !existing.unitRaw) {
            existing.draft.unit = displayUnitForStorage(parsed.canonicalUnit || parsed.unit);
            existing.unitRaw = parsed.canonicalUnit || parsed.unit;
          }
          if (existing.qty == null && !existing.draft.ingredient_name.includes(parsed.name)) {
            // fallback lisible lorsque les unités ne peuvent pas être fusionnées
            existing.draft.ingredient_name = `${existing.draft.ingredient_name} + ${displayLine}`;
          }
        }
      }
    }
  }

  return [...map.values()].map((v) => v.draft);
}

export function mergePlannerPreferences(
  base: PlannerPreferences,
  override: PlannerGenerateInput
): PlannerPreferences {
  return {
    cooking_time_preference:
      override.cooking_time_preference ?? base.cooking_time_preference,
    household_size: override.household_size ?? base.household_size,
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
