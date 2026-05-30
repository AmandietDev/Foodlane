import type { Recipe } from "./recipes";
import type { BreakfastPreferenceKey, PlannerMealType } from "./plannerConstants";
import { getMealSlots, getDishType, getEffectiveFamily, normalizeText } from "./recipeFields";

/**
 * Compatibilité recette ↔ créneau de repas.
 *
 * Source of truth :
 *  1. Si la colonne `meal_slot` est renseignée → on l'utilise comme contrainte forte
 *     (la diététicienne / la base décide ce qui est adapté).
 *  2. Sinon, fallback heuristique (regex sur nom + type + family + ingredients).
 *
 * Mapping créneau UI ↔ valeurs DB autorisées :
 *   breakfast → ["petit dejeuner", "petit-dejeuner", "brunch", "breakfast"]
 *   lunch     → ["dejeuner", "brunch", "plat principal", "lunch"]
 *   dinner    → ["diner", "plat principal", "dinner"]
 *   snack     → ["collation", "gouter", "snack", "dessert"]
 */

function recipeText(r: Recipe): string {
  return normalizeText(
    `${r.nom_recette || ""} ${r.type || ""} ${r.family || ""} ${r.meal_subtype || ""} ${r.ingredients || ""}`
  );
}

function isClearlySweet(r: Recipe): boolean {
  const t = recipeText(r);
  if (/\b(sucre|sucree|dessert|gateau|cookie|brownie|fondant|moelleux|tarte sucree|crepe sucree|gaufre|madeleine|financier|quatre-quarts|clafoutis|far breton|flan|tiramisu|mousse au chocolat|panna cotta|creme brulee|cheesecake|verrine|compote|confiture|coulis|sorbet|glace)\b/.test(t)) return true;
  const sub = normalizeText(r.meal_subtype || "");
  if (sub === "dessert") return true;
  return /sucre/.test(normalizeText(r.type || ""));
}

function isClearlySavory(r: Recipe): boolean {
  const t = recipeText(r);
  return /\b(sale|plat|dejeuner|diner|omelette|sandwich|wrap|toast|entree|salade|gratin|tartiflette|quiche|risotto|paella|curry)\b/.test(t) ||
    /sale/.test(normalizeText(r.type || ""));
}

/**
 * Détection FORTE qu'une recette est manifestement un plat principal salé
 * (déjeuner/dîner). Sert à rejeter en bloc ce genre de recettes pour le
 * petit-déjeuner ou la collation, même si meal_slot est vide.
 */
function isMainCourseLike(r: Recipe): boolean {
  const t = recipeText(r);
  const dish = normalizeText(r.dish_type || "");
  if (dish.includes("plat principal") || dish.includes("plat-principal")) return true;
  if (dish === "entree") return true;
  // Plats typiques déjeuner/dîner
  if (/\b(gratin|tartiflette|parmentier|hachis|lasagne|moussaka|tajine|paella|risotto|chili|bourguignon|blanquette|navarin|cassoulet|pot au feu|pot-au-feu|ragout|daube|carbonara|bolognaise|bolognese|carbonnade|coq au vin)\b/.test(t)) return true;
  // Dolmas, samoussa et autres préparations farcies typiquement repas principal
  if (/\b(dolmas|dolma|farci|farcie|farcis|farcies)\b/.test(t)) return true;
  // Poisson + pâtes / riz / quinoa → presque toujours un repas principal
  if (/\b(pates|spaghetti|penne|tagliatelle|riz|quinoa|nouilles)\b/.test(t) &&
      /\b(saumon|thon|cabillaud|poulet|boeuf|porc|veau|agneau|crevette)\b/.test(t)) {
    return true;
  }
  return false;
}

function isDrinkLike(r: Recipe): boolean {
  const t = recipeText(r);
  const fam = getEffectiveFamily(r);
  if (fam === "boisson" || fam === "smoothie") return true;
  return /\b(smoothie|milkshake|boisson|jus\b|shake|infusion|the\b|cafe\b|chocolat chaud)\b/.test(t);
}

function isSoupLike(r: Recipe): boolean {
  const t = recipeText(r);
  const fam = getEffectiveFamily(r);
  if (fam === "soupe") return true;
  return /\b(soupe|veloute|potage|bouillon|bisque|gaspacho|gazpacho|creme de\b)\b/.test(t);
}

/** Recette identifiée positivement comme adaptée au petit-déjeuner. */
function isBreakfastAppropriate(r: Recipe): boolean {
  const t = recipeText(r);
  if (/\b(petit.?dej|breakfast|brunch|matin)\b/.test(t)) return true;
  if ((r.meal_subtype || "").toLowerCase().includes("breakfast")) return true;
  if (/\b(porridge|muesli|granola|cereale|flocon|avoine|pancake|crepe\b|gaufre|tartine|toast|brioche|pain perdu|french toast|muffin|scone|bagel|croissant|viennoiserie)\b/.test(t)) return true;
  // Sucré simple (hors soupe/boisson)
  if (isClearlySweet(r) && !isSoupLike(r) && !isDrinkLike(r)) return true;
  // Salé typique petit-déj : œufs, omelette, toast salé
  if (/\b(oeuf|oeufs|brouille|omelette|frittata|shakshuka|toast|tartine)\b/.test(t)) return true;
  return false;
}

/** Recette identifiée positivement comme adaptée à une collation. */
function isSnackAppropriate(r: Recipe): boolean {
  const t = recipeText(r);
  if (/\b(fruit|compote|yaourt|yogourt|fromage blanc|barre|energie|noix|amande|noisette|cajou|pistache|cacahuete|muesli|granola|biscuit|cake\b|madeleine|financier|brownie|cookie|smoothie|jus\b)\b/.test(t)) return true;
  if (isBreakfastAppropriate(r)) return true;
  if (isClearlySweet(r) && !isSoupLike(r)) return true;
  if (isDrinkLike(r)) return true;
  return false;
}

/**
 * Vrai si la recette déclare explicitement (via meal_slot DB) qu'elle convient
 * à ce créneau. Le matching est flexible pour gérer les variantes réelles
 * trouvées en base :
 *   - "petit dejeuner sale" / "petit dejeuner sucre" → breakfast (contient "petit dejeuner")
 *   - "tiner" (typo de "diner") → dinner
 *   - "smoothie", "smoothie bowl" → breakfast OU snack
 *   - "petit dejeuner" / "dejeuner" : matching EXACT pour éviter qu'un slot
 *     "petit dejeuner" soit aussi compté comme "dejeuner".
 */
function slotMatchesMeal(slot: string, meal: PlannerMealType): boolean {
  if (meal === "breakfast") {
    if (slot.includes("petit dejeuner") || slot.includes("petit-dejeuner")) return true;
    return slot === "brunch" || slot === "breakfast" || slot === "matin" || slot === "smoothie" || slot === "smoothie bowl";
  }
  if (meal === "lunch") {
    // Exact "dejeuner" — exclut "petit dejeuner" qui est traité plus haut
    return slot === "dejeuner" || slot === "lunch" || slot === "midi" || slot === "brunch" || slot === "plat principal" || slot === "plat-principal";
  }
  if (meal === "dinner") {
    return slot === "diner" || slot === "dinner" || slot === "soir" || slot === "plat principal" || slot === "plat-principal" || slot === "tiner";
  }
  if (meal === "snack") {
    return (
      slot === "collation" ||
      slot === "snack" ||
      slot === "gouter" ||
      slot === "dessert" ||
      slot === "encas" ||
      slot === "en-cas" ||
      slot.includes("smoothie")
    );
  }
  return false;
}

/** Vrai si la recette déclare explicitement (via meal_slot DB) qu'elle convient à ce créneau. */
function meal_slotAllowsSlot(recipe: Recipe, meal: PlannerMealType): boolean {
  const slots = getMealSlots(recipe);
  if (slots.length === 0) return false;
  return slots.some((s) => slotMatchesMeal(s, meal));
}

/** Vrai si meal_slot exclut explicitement ce créneau (renseigné mais incompatible). */
function meal_slotForbidsSlot(recipe: Recipe, meal: PlannerMealType): boolean {
  const slots = getMealSlots(recipe);
  if (slots.length === 0) return false;
  return !slots.some((s) => slotMatchesMeal(s, meal));
}

/**
 * Compatibilité recette ↔ créneau.
 *
 * Logique :
 *   1. Si meal_slot est renseigné, il fait foi (autorise OU exclut directement).
 *   2. Sinon, on applique des règles heuristiques strictes :
 *      - petit-déj : pas de soupe / boisson non sucrée, doit être positivement breakfast
 *      - collation : pas de soupe, doit être positivement snack
 *      - déjeuner/dîner : pas de boisson, pas de pur dessert sucré
 *      - dîner spécifique : pas de smoothie / pur sucré même si la recette est "appropriée"
 */
/** Bonus / malus selon la préférence petit-déjeuner (sucré / salé / les deux). */
export function scoreBreakfastPreference(
  recipe: Recipe,
  pref: BreakfastPreferenceKey
): number {
  if (pref === "both") return 0;
  const sweet = isClearlySweet(recipe);
  const savory =
    isClearlySavory(recipe) ||
    /\b(omelette|oeuf|oeufs|toast|tartine|avocado|wrap|muffin sale|shakshuka|frittata)\b/.test(
      recipeText(recipe)
    );
  if (pref === "sweet") {
    if (sweet && !savory) return 28;
    if (savory && !sweet) return -22;
    return 8;
  }
  if (savory && !sweet) return 28;
  if (sweet && !savory) return -22;
  return 8;
}

export function isRecipeCompatibleWithMealType(
  recipe: Recipe,
  meal: PlannerMealType
): boolean {
  // 1. Source of truth : colonne meal_slot
  if (meal_slotAllowsSlot(recipe, meal)) return true;
  if (meal_slotForbidsSlot(recipe, meal)) return false;

  // 2. Fallback heuristique — utilisé SEULEMENT si meal_slot est vide.
  //    On est strict : mieux vaut rejeter une recette ambiguë que mettre un
  //    plat principal au petit-déjeuner.
  const dish = getDishType(recipe);

  if (meal === "breakfast") {
    // Exclusions absolues
    if (isSoupLike(recipe)) return false;
    if (isMainCourseLike(recipe)) return false;
    if (isDrinkLike(recipe) && !isClearlySweet(recipe)) return false;
    if (dish === "soupe" || dish === "plat principal" || dish === "plat-principal" || dish === "entree") return false;
    // Exiger identification POSITIVE (sinon on rejette)
    return isBreakfastAppropriate(recipe);
  }

  if (meal === "snack") {
    if (isSoupLike(recipe)) return false;
    if (isMainCourseLike(recipe)) return false;
    if (dish === "plat principal" || dish === "plat-principal" || dish === "entree") return false;
    // Exiger identification POSITIVE
    return isSnackAppropriate(recipe);
  }

  // Lunch / Dinner : permissif mais on exclut les boissons et les purs desserts.
  if (isDrinkLike(recipe)) return false;
  if (dish === "dessert" || dish === "boisson") return false;
  if (isClearlySweet(recipe) && !isClearlySavory(recipe) && !isSoupLike(recipe)) {
    // Pur dessert sucré → non OK pour dîner/déjeuner
    return false;
  }
  // Dîner spécifique : pas de smoothie/pancake/crêpe pure même si meal_slot vide
  if (meal === "dinner") {
    const t = recipeText(recipe);
    if (/\b(smoothie|milkshake|pancake|crepe sucree|gaufre)\b/.test(t)) return false;
  }
  return true;
}
