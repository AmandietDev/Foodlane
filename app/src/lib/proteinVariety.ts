import type { Recipe } from "./recipes";
import { getMainProteins, normalizeText } from "./recipeFields";

/**
 * Détection des protéines dominantes d'une recette.
 *
 * Source of truth :
 *   1. Colonne `main_protein` (recipes_v2) — multi-valeurs autorisées.
 *   2. Fallback : regex sur nom + ingrédients (legacy).
 *
 * Utilisé pour :
 *   - éviter la même protéine deux fois dans la même journée
 *   - cap hebdomadaire (max 2 fois la même protéine par semaine)
 *   - bonus de variété cross-day
 */
const DOMINANT_TOKENS: readonly string[] = [
  "saumon", "thon", "cabillaud", "maquereau", "sardine",
  "lieu", "colin", "merlu", "dorade", "bar", "truite",
  "crevette", "crevettes", "moule", "moules", "calamar",
  "poulet", "dinde", "canard", "lapin",
  "boeuf", "bœuf", "porc", "veau", "agneau", "mouton",
  "jambon", "lardons", "saucisse", "chorizo",
  "tofu", "tempeh", "seitan",
  "lentille", "lentilles", "pois chiche", "pois chiches",
  "haricot rouge", "haricots rouges", "haricot blanc", "haricots blancs",
  "oeuf", "oeufs",
];

/** Famille canonique pour rapprocher des termes proches (poulet/dinde = volaille, etc.) */
const PROTEIN_FAMILY: Record<string, string> = {
  poulet: "volaille",
  dinde: "volaille",
  canard: "volaille",
  boeuf: "viande_rouge",
  "bœuf": "viande_rouge",
  agneau: "viande_rouge",
  mouton: "viande_rouge",
  porc: "porc",
  jambon: "porc",
  lardons: "porc",
  chorizo: "porc",
  saucisse: "porc",
  saumon: "poisson_gras",
  thon: "poisson_gras",
  maquereau: "poisson_gras",
  sardine: "poisson_gras",
  cabillaud: "poisson_blanc",
  lieu: "poisson_blanc",
  colin: "poisson_blanc",
  merlu: "poisson_blanc",
  dorade: "poisson_blanc",
  bar: "poisson_blanc",
  truite: "poisson_blanc",
  crevette: "fruits_de_mer",
  crevettes: "fruits_de_mer",
  moule: "fruits_de_mer",
  moules: "fruits_de_mer",
  calamar: "fruits_de_mer",
  tofu: "vegetal_soja",
  tempeh: "vegetal_soja",
  seitan: "vegetal_gluten",
  lentille: "legumineuses",
  lentilles: "legumineuses",
  "pois chiche": "legumineuses",
  "pois chiches": "legumineuses",
  "haricot rouge": "legumineuses",
  "haricots rouges": "legumineuses",
  "haricot blanc": "legumineuses",
  "haricots blancs": "legumineuses",
  oeuf: "oeufs",
  oeufs: "oeufs",
};

/** Mappe un token vers sa famille canonique (sinon retourne le token). */
function toFamily(token: string): string {
  const n = normalizeText(token);
  return PROTEIN_FAMILY[n] || n;
}

/**
 * Tokens de protéines présents dans une recette (DB + fallback regex).
 * Retourne les FAMILLES canoniques (volaille, poisson_blanc, etc.) pour
 * une comparaison robuste.
 */
export function recipeDominantProteinKeys(recipe: Recipe): string[] {
  const dbProteins = getMainProteins(recipe);
  if (dbProteins.length > 0) {
    return [...new Set(dbProteins.map(toFamily))];
  }

  // Fallback : regex sur nom + ingrédients (recettes sans main_protein renseigné)
  const text = normalizeText(`${recipe.nom_recette || ""} ${recipe.ingredients || ""}`);
  const found = new Set<string>();
  for (const tok of DOMINANT_TOKENS) {
    const t = normalizeText(tok);
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${esc}\\b`, "i").test(text)) {
      found.add(toFamily(t));
    }
  }
  return [...found];
}

export function dominantKeysConflictWithDay(
  recipe: Recipe,
  alreadyUsedKeys: Set<string>
): boolean {
  const keys = recipeDominantProteinKeys(recipe);
  if (keys.length === 0) return false;
  return keys.some((k) => alreadyUsedKeys.has(k));
}

export function addRecipeDominantKeys(recipe: Recipe, daySet: Set<string>): void {
  for (const k of recipeDominantProteinKeys(recipe)) {
    daySet.add(k);
  }
}
