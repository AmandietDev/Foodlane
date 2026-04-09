import type { Recipe } from "./recipes";

/**
 * Termes de protéines / poissons à ne pas répéter le même jour (ex. saumon midi + saumon soir).
 * Clés normalisées (sans accent) pour comparaison.
 */
const DOMINANT_TOKENS: readonly string[] = [
  "saumon",
  "thon",
  "cabillaud",
  "maquereau",
  "sardine",
  "lieu",
  "colin",
  "crevette",
  "crevettes",
  "moule",
  "moules",
  "calamar",
  "poulet",
  "dinde",
  "canard",
  "lapin",
  "boeuf",
  "bœuf",
  "porc",
  "veau",
  "agneau",
  "mouton",
  "jambon",
  "lardons",
  "saucisse",
  "chorizo",
  "tofu",
  "tempeh",
  "lentille",
  "lentilles",
  "pois chiche",
  "pois chiches",
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 Renvoie les clés dominantes présentes dans le nom + les ingrédients de la recette.
 */
export function recipeDominantProteinKeys(recipe: Recipe): string[] {
  const text = norm(`${recipe.nom_recette || ""} ${recipe.ingredients || ""}`);
  const found = new Set<string>();
  for (const tok of DOMINANT_TOKENS) {
    const t = norm(tok);
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${esc}\\b`, "i").test(text)) {
      found.add(t);
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
