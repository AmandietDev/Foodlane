/**
 * Filtrage diététique structuré utilisant `recipes_v2.diet_tags` et `allergens`.
 *
 * Deux niveaux complémentaires :
 *  1. Tag structuré (DB) — quand `diet_tags` / `allergens` sont renseignés,
 *     la décision est immédiate et fiable.
 *  2. Fallback regex (legacy) — quand les colonnes sont vides, on tombe sur
 *     la liste de mots-clés dans `ingredients` (ancien comportement).
 *
 * Mapping clé UI ↔ tag DB attendu :
 *   vegetarien          → diet_tags contient "vegetarien" / "vegetarian"
 *   vegan               → "vegan" / "vegetalien"
 *   pescetarien         → "pescetarien" / "pescatarian"
 *   sans_gluten         → "sans gluten" / "gluten free"   (OU allergens NE contient PAS "gluten")
 *   sans_lactose        → "sans lactose"                   (OU allergens NE contient PAS "lactose")
 *   sans_porc, sans_oeufs, sans_soja, sans_fruits_coque, sans_arachides,
 *   sans_poisson, sans_crustaces, sans_arachides           → idem (via allergens NE contient PAS)
 *
 * Allergies utilisateur (allergy_keys) → vérification stricte via `allergens`
 *   "gluten" → recette EXCLUE si allergens contient "gluten"
 *   "lactose" → idem
 *   etc.
 */
import type { Recipe } from "./recipes";
import { getAllergens, getDietTags, getMainProteins, normalizeText } from "./recipeFields";
import type { DietaryFilterKey } from "./plannerConstants";

/** Tags de régime positifs attendus dans `diet_tags` pour chaque filtre. */
const POSITIVE_DIET_TAGS: Partial<Record<DietaryFilterKey, string[]>> = {
  vegetarien: ["vegetarien", "vegetarian", "veggie"],
  vegan: ["vegan", "vegetalien", "vegetalienne"],
  pescetarien: ["pescetarien", "pescatarian", "pescetarienne"],
  flexitarien: ["flexitarien", "flexitarienne"],
  sans_gluten: ["sans gluten", "gluten free", "gluten-free"],
  sans_lactose: ["sans lactose", "lactose free", "lactose-free"],
  sans_porc: ["sans porc", "halal", "casher"],
  sans_fruits_coque: ["sans fruits a coque", "nut free", "nut-free"],
  sans_arachides: ["sans arachides", "peanut free"],
  sans_oeufs: ["sans oeufs", "egg free"],
  sans_soja: ["sans soja", "soy free"],
  sans_poisson: ["sans poisson"],
  sans_crustaces: ["sans crustaces"],
};

/** Allergènes à exclure (présents dans `allergens`) pour chaque filtre. */
const FORBIDDEN_ALLERGENS: Partial<Record<DietaryFilterKey, string[]>> = {
  sans_gluten: ["gluten", "ble", "froment", "seigle", "orge", "epeautre"],
  sans_lactose: ["lactose", "lait"],
  sans_fruits_coque: ["fruits a coque", "noix", "amande", "noisette"],
  sans_arachides: ["arachides", "arachide", "cacahuete"],
  sans_oeufs: ["oeufs", "oeuf"],
  sans_soja: ["soja"],
  sans_poisson: ["poisson"],
  sans_crustaces: ["crustaces", "crustace"],
};

/** Protéines interdites par un régime (vérifiées dans main_protein). */
const FORBIDDEN_PROTEINS: Partial<Record<DietaryFilterKey, string[]>> = {
  vegetarien: [
    "poulet", "dinde", "canard", "lapin", "boeuf", "bœuf", "porc", "veau",
    "agneau", "mouton", "jambon", "lardons", "saucisse", "chorizo",
    "poisson", "saumon", "thon", "cabillaud", "maquereau", "sardine",
    "crevette", "crevettes", "moule", "moules",
  ],
  vegan: [
    "poulet", "dinde", "canard", "lapin", "boeuf", "bœuf", "porc", "veau",
    "agneau", "mouton", "jambon", "lardons", "saucisse", "chorizo",
    "poisson", "saumon", "thon", "cabillaud", "maquereau", "sardine",
    "crevette", "crevettes", "moule", "moules", "oeuf", "oeufs",
    "lait", "yaourt", "fromage", "beurre",
  ],
  pescetarien: [
    "poulet", "dinde", "canard", "lapin", "boeuf", "bœuf", "porc", "veau",
    "agneau", "mouton", "jambon", "lardons", "saucisse", "chorizo",
  ],
  sans_porc: ["porc", "jambon", "lardons", "saucisse", "chorizo"],
  sans_poisson: [
    "poisson", "saumon", "thon", "cabillaud", "maquereau", "sardine",
    "lieu", "colin", "merlu", "dorade", "bar", "truite",
  ],
  sans_oeufs: ["oeuf", "oeufs"],
};

/**
 * Retourne true si la recette respecte un filtre diététique donné.
 *
 * Logique :
 *  1. Si la recette a un diet_tag POSITIF correspondant → OK direct (ex. tag "vegetarien")
 *  2. Si la recette a un allergen INTERDIT par ce filtre → KO direct (ex. "gluten" pour sans_gluten)
 *  3. Si main_protein contient une protéine INTERDITE → KO direct
 *  4. Sinon, on retourne true (le fallback regex sur ingredients sera fait par
 *     `filterRecipesByStrictExclusions`).
 */
export function recipeMatchesDietaryFilter(
  recipe: Recipe,
  filter: DietaryFilterKey
): boolean {
  const dietTags = new Set(getDietTags(recipe));
  const allergens = new Set(getAllergens(recipe));
  const proteins = new Set(getMainProteins(recipe).map(normalizeText));

  // 1. Tag positif → match direct
  const positive = POSITIVE_DIET_TAGS[filter] || [];
  if (positive.some((t) => dietTags.has(normalizeText(t)))) {
    return true;
  }

  // 2. Allergène interdit → KO
  const forbiddenAllergens = FORBIDDEN_ALLERGENS[filter] || [];
  if (forbiddenAllergens.some((a) => allergens.has(normalizeText(a)))) {
    return false;
  }

  // 3. Protéine interdite → KO
  const forbiddenProteins = FORBIDDEN_PROTEINS[filter] || [];
  if (forbiddenProteins.some((p) => proteins.has(normalizeText(p)))) {
    return false;
  }

  // 4. Données insuffisantes côté DB → décision déléguée au filtre regex sur ingredients
  return true;
}

/**
 * Vrai si la recette contient un des allergènes utilisateur (allergy_keys).
 * Vérifie d'abord la colonne structurée `allergens`, puis fallback ingredients.
 */
export function recipeContainsUserAllergen(
  recipe: Recipe,
  allergyKeys: string[]
): boolean {
  if (allergyKeys.length === 0) return false;
  const allergens = new Set(getAllergens(recipe));
  if (allergens.size > 0) {
    for (const key of allergyKeys) {
      const n = normalizeText(key);
      if (allergens.has(n)) return true;
    }
  }
  return false;
}

/**
 * Filtre dur appliqué avant scoring : élimine toutes les recettes qui :
 *   - violent un filtre diététique structuré (diet_tags / allergens / main_protein)
 *   - ou contiennent un allergène utilisateur déclaré
 *
 * À combiner avec `filterRecipesByStrictExclusions` qui couvre le legacy
 * (regex sur ingredients).
 */
export function filterRecipesByStructuredDietaryRules(
  recipes: Recipe[],
  filters: DietaryFilterKey[],
  allergyKeys: string[]
): Recipe[] {
  if (filters.length === 0 && allergyKeys.length === 0) return recipes;
  return recipes.filter((r) => {
    if (recipeContainsUserAllergen(r, allergyKeys)) return false;
    for (const f of filters) {
      if (!recipeMatchesDietaryFilter(r, f)) return false;
    }
    return true;
  });
}
