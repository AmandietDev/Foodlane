/** Normalisation pour recherche d'ingrédients (sans accents, minuscules). */
export function normalizeIngredientSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Variantes singulier/pluriel simples (français courant). */
export function ingredientTermVariants(term: string): string[] {
  const t = normalizeIngredientSearch(term);
  if (!t) return [];
  const variants = new Set<string>([t]);

  if (t.endsWith("s") && t.length > 3) {
    variants.add(t.slice(0, -1));
  } else if (!t.endsWith("s")) {
    variants.add(`${t}s`);
  }

  if (t.endsWith("x") && t.length > 3) {
    variants.add(t.slice(0, -1));
  }

  return [...variants];
}

/**
 * Mot entier uniquement — « oeuf » ne matche pas « boeuf ».
 * Teste aussi les variantes plurielles (oeuf / oeufs).
 */
export function ingredientTermMatchesText(text: string, term: string): boolean {
  const haystack = normalizeIngredientSearch(text);
  if (!haystack || !term.trim()) return false;

  for (const variant of ingredientTermVariants(term)) {
    if (variant.length < 2) continue;
    const re = new RegExp(`\\b${escapeRegex(variant)}\\b`, "i");
    if (re.test(haystack)) return true;
  }
  return false;
}

/** Tous les termes doivent être présents (AND). */
export function ingredientTermsMatchAll(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  return terms.every((term) => ingredientTermMatchesText(text, term));
}

export function recipeSearchBlob(r: Record<string, unknown>): string {
  return [
    String(r.nom_recette || ""),
    String(r.description_courte || ""),
    String(r.ingredients_quantites || r.ingredients || ""),
  ].join(" ");
}

export function scoreRecipeByTerms(r: Record<string, unknown>, terms: string[]): number {
  const nom = normalizeIngredientSearch(String(r.nom_recette || ""));
  const desc = normalizeIngredientSearch(String(r.description_courte || ""));
  const ing = normalizeIngredientSearch(String(r.ingredients_quantites || r.ingredients || ""));

  let score = 0;
  for (const term of terms) {
    const variants = ingredientTermVariants(term);
    let matched = false;
    for (const v of variants) {
      if (!v) continue;
      const re = new RegExp(`\\b${escapeRegex(v)}\\b`, "i");
      if (re.test(nom)) {
        score += 12;
        matched = true;
        break;
      }
      if (re.test(desc)) {
        score += 4;
        matched = true;
        break;
      }
      if (re.test(ing)) {
        score += 2;
        matched = true;
        break;
      }
    }
    if (!matched) return 0;
  }
  return score;
}
