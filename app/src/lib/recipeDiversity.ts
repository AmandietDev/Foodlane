import type { Recipe } from "./recipes";
import {
  getDishType,
  getMainCarb,
  getMainVegetables,
  getCookingMethod,
  getTexture,
  getEffectiveFamily,
  normalizeText,
} from "./recipeFields";

/**
 * Système de tags de diversité d'une recette.
 *
 * Une recette est étiquetée avec plusieurs tags structurels :
 *   - dish:<dish_type>     (ex. "dish:salade", "dish:gratin")
 *   - family:<family>      (ex. "family:soupe", "family:bowl")
 *   - carb:<main_carb>     (ex. "carb:riz", "carb:pates")
 *   - veg:<vegetable>      (ex. "veg:courgette") — un tag par légume principal
 *   - method:<cooking>     (ex. "method:four", "method:poele")
 *   - texture:<texture>    (ex. "texture:liquide")
 *
 * Chaque tag a un CAP hebdomadaire au-delà duquel toute nouvelle recette
 * partageant ce tag est rejetée par le sélecteur.
 *
 * Les caps dépendent du nombre total de slots dans la semaine (ex. 7 jours x
 * 3 repas = 21 slots) : on évite les seuils absurdes pour les petits menus.
 */

/** Patterns texte (fallback historique quand dish_type/family sont vides). */
const LEGACY_TEXT_PATTERNS: Array<{ tag: string; re: RegExp }> = [
  { tag: "dish:smoothie", re: /\b(smoothie|milkshake)\b/ },
  { tag: "dish:bowl", re: /\b(bowl|poke)\b/ },
  { tag: "dish:salade", re: /\b(salade|taboule|tabouleh|coleslaw)\b/ },
  { tag: "dish:soupe", re: /\b(soupe|veloute|potage|bouillon)\b/ },
  { tag: "dish:gratin", re: /\b(gratin|parmentier)\b/ },
  { tag: "dish:quiche_tarte", re: /\b(quiche|tarte|tourte)\b/ },
  { tag: "dish:pizza", re: /\b(pizza|flamiche|flammenkueche)\b/ },
  { tag: "dish:pates", re: /\b(pates|pate\b|spaghetti|penne|tagliatelle|lasagne|gnocchi)\b/ },
  { tag: "dish:riz", re: /\b(riz|risotto)\b/ },
  { tag: "dish:curry", re: /\b(curry|dahl|dal)\b/ },
  { tag: "dish:omelette", re: /\b(omelette|oeufs brouilles|oeuf coque)\b/ },
  { tag: "dish:sandwich_wrap", re: /\b(sandwich|burger|wrap|tacos|quesadilla)\b/ },
  { tag: "dish:pancake_crepe", re: /\b(pancake|crepe|gaufre|blini)\b/ },
];

/**
 * Calcule le cap hebdomadaire pour un tag donné en fonction du volume du menu.
 * Plus le tag est "spécifique" (smoothie, gratin), plus le cap est bas.
 */
function capForTag(tag: string, totalSlots: number): number {
  // Familles très repérables → cap strict
  if (
    tag === "dish:smoothie" ||
    tag === "family:smoothie" ||
    tag === "family:boisson"
  ) {
    return Math.max(1, Math.ceil(totalSlots * 0.12));
  }
  if (
    tag === "dish:gratin" ||
    tag === "dish:quiche_tarte" ||
    tag === "dish:pizza" ||
    tag === "dish:curry" ||
    tag === "family:gratin" ||
    tag === "family:tarte_salee" ||
    tag === "family:pizza"
  ) {
    return Math.max(1, Math.ceil(totalSlots * 0.15));
  }
  // Bowls / salades : max 2 par semaine sur menu standard
  if (tag === "dish:bowl" || tag === "dish:salade" || tag === "family:salade") {
    return Math.max(2, Math.ceil(totalSlots * 0.2));
  }
  // Féculents (main_carb) : max 2 occurrences du même féculent par semaine
  if (tag.startsWith("carb:")) {
    return Math.max(2, Math.ceil(totalSlots * 0.2));
  }
  // Méthodes de cuisson : limitation modérée
  if (tag.startsWith("method:")) {
    return Math.max(3, Math.ceil(totalSlots * 0.4));
  }
  // Textures : tolérantes mais évite tout liquide / tout cremeux
  if (tag.startsWith("texture:")) {
    return Math.max(3, Math.ceil(totalSlots * 0.4));
  }
  // Légumes principaux : un même légume max 2 fois par semaine
  if (tag.startsWith("veg:")) {
    return Math.max(2, Math.ceil(totalSlots * 0.2));
  }
  // Soupe : cap raisonnable
  if (tag === "dish:soupe" || tag === "family:soupe") {
    return Math.max(2, Math.ceil(totalSlots * 0.2));
  }
  // Default
  return Math.max(2, Math.ceil(totalSlots * 0.24));
}

/**
 * Retourne tous les tags de diversité d'une recette.
 * Privilégie les colonnes DB structurées ; fallback regex sur le texte si vide.
 */
export function recipeDiversityTags(recipe: Recipe): string[] {
  const out = new Set<string>();

  // 1. dish_type / family (DB en priorité)
  const dish = getDishType(recipe);
  if (dish) out.add(`dish:${dish.replace(/\s+/g, "_")}`);
  const family = getEffectiveFamily(recipe);
  if (family) out.add(`family:${family.replace(/\s+/g, "_")}`);

  // 2. main_carb (féculent principal)
  const carb = getMainCarb(recipe);
  if (carb && carb !== "sans" && carb !== "aucun") {
    out.add(`carb:${carb.replace(/\s+/g, "_")}`);
  }

  // 3. main_vegetables (un tag par légume — utile pour cap "trop de courgette")
  for (const veg of getMainVegetables(recipe)) {
    out.add(`veg:${veg.replace(/\s+/g, "_")}`);
  }

  // 4. cooking_method
  const method = getCookingMethod(recipe);
  if (method) out.add(`method:${method.replace(/\s+/g, "_")}`);

  // 5. texture
  const texture = getTexture(recipe);
  if (texture) out.add(`texture:${texture.replace(/\s+/g, "_")}`);

  // 6. Fallback regex texte si rien de structuré n'est ressorti
  if (out.size === 0) {
    const text = normalizeText(
      `${recipe.nom_recette || ""} ${recipe.type || ""} ${recipe.ingredients || ""}`
    );
    for (const { tag, re } of LEGACY_TEXT_PATTERNS) {
      if (re.test(text)) out.add(tag);
    }
  }

  return [...out];
}

/**
 * Vrai si ajouter cette recette ferait sauter au moins un cap de diversité.
 */
export function wouldExceedWeekDiversityCap(
  recipe: Recipe,
  weekTagCounts: Map<string, number>,
  totalSlots: number
): boolean {
  const tags = recipeDiversityTags(recipe);
  if (tags.length === 0) return false;
  return tags.some((tag) => (weekTagCounts.get(tag) || 0) >= capForTag(tag, totalSlots));
}

/**
 * Met à jour le compteur de tags pour la semaine après ajout d'une recette.
 */
export function addRecipeDiversityTags(
  recipe: Recipe,
  weekTagCounts: Map<string, number>
): void {
  const tags = recipeDiversityTags(recipe);
  for (const t of tags) {
    weekTagCounts.set(t, (weekTagCounts.get(t) || 0) + 1);
  }
}
