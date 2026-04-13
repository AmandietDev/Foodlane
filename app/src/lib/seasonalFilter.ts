// Filtrage automatique des recettes selon la saison
// Logique centralisée : colonne DB `saison` en priorité, détection par ingrédients en fallback

export type Season = "printemps" | "été" | "automne" | "hiver";

// Ingrédients typiques de chaque saison
const SEASONAL_INGREDIENTS: Record<Season, string[]> = {
  printemps: [
    "asperge", "asperges",
    "petits pois", "petit pois",
    "radis", "radis",
    "artichaut", "artichauts",
    "épinard", "épinards",
    "fraise", "fraises",
    "rhubarbe",
    "menthe",
    "ciboulette",
    "pois",
  ],
  été: [
    "tomate", "tomates",
    "courgette", "courgettes",
    "aubergine", "aubergines",
    "poivron", "poivrons",
    "concombre", "concombres",
    "salade",
    "basilic",
    "melon",
    "pastèque",
    "pêche", "pêches",
    "abricot", "abricots",
    "cerise", "cerises",
    "framboise", "framboises",
    "myrtille", "myrtilles",
    "courge",
    "haricot vert", "haricots verts",
  ],
  automne: [
    "champignon", "champignons",
    "potiron",
    "courge", "courges",
    "patate douce", "patates douces",
    "chou", "choux",
    "chou-fleur",
    "brocoli",
    "noix",
    "noisette", "noisettes",
    "raisin", "raisins",
    "poire", "poires",
    "pomme", "pommes",
    "prune", "prunes",
    "figue", "figues",
  ],
  hiver: [
    "chou", "choux",
    "chou-fleur",
    "brocoli",
    "endive", "endives",
    "mâche",
    "carotte", "carottes",
    "pomme de terre", "pommes de terre",
    "navet", "navets",
    "poireau", "poireaux",
    "orange", "oranges",
    "clémentine", "clémentines",
    "mandarine", "mandarines",
    "kiwi", "kiwis",
    "châtaigne", "châtaignes",
  ],
};

// Détecter la saison actuelle
export function getCurrentSeason(): Season {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12

  if (month >= 3 && month <= 5) {
    return "printemps";
  } else if (month >= 6 && month <= 8) {
    return "été";
  } else if (month >= 9 && month <= 11) {
    return "automne";
  } else {
    return "hiver";
  }
}

// Vérifier si une recette contient des ingrédients de saison
export function isRecipeSeasonal(recipe: { ingredients: string | null }, season: Season): boolean {
  const ingredientsLower = (recipe.ingredients || "").toLowerCase();
  const seasonalIngredients = SEASONAL_INGREDIENTS[season];

  // Vérifier si au moins un ingrédient de saison est présent
  return seasonalIngredients.some((ingredient) =>
    ingredientsLower.includes(ingredient.toLowerCase())
  );
}

// Filtrer les recettes selon la saison actuelle
export function filterRecipesBySeason<T extends { ingredients: string | null }>(
  recipes: T[],
  season?: Season
): T[] {
  const currentSeason = season || getCurrentSeason();

  // Si aucune recette n'a d'ingrédients de saison, on retourne toutes les recettes
  // Sinon, on filtre pour garder seulement celles avec des ingrédients de saison
  const seasonalRecipes = recipes.filter((recipe) =>
    isRecipeSeasonal(recipe, currentSeason)
  );

  // Si on trouve des recettes de saison, on les retourne
  // Sinon, on retourne toutes les recettes (pour ne pas avoir de résultats vides)
  return seasonalRecipes.length > 0 ? seasonalRecipes : recipes;
}

// Obtenir le nom de la saison en français
export function getSeasonName(season: Season): string {
  const names: Record<Season, string> = {
    printemps: "Printemps",
    été: "Été",
    automne: "Automne",
    hiver: "Hiver",
  };
  return names[season];
}

// ---------------------------------------------------------------------------
// Helpers basés sur la colonne DB `saison`
// ---------------------------------------------------------------------------

/** Normalise une chaîne brute (sans accents, minuscule, séparateurs → espace). */
function normalizeRaw(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprime les accents
    .replace(/['\u2019]/g, " ")      // apostrophe → espace
    .replace(/[_\-\/,;|+]+/g, " ")  // séparateurs → espace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalise la valeur brute de la colonne `saison` en un tableau de Season.
 * Gère les valeurs composites ("printemps été", "automne hiver"), "toute l'année", etc.
 *
 * Exemples supportés :
 *   "printemps été"  → ["printemps","été"]
 *   "automne hiver"  → ["automne","hiver"]
 *   "toute l'année"  → ["printemps","été","automne","hiver"]
 *   "été"            → ["été"]
 *   "hiver"          → ["hiver"]
 */
export function normalizeSeason(raw: string | null | undefined): Season[] {
  if (!raw?.trim()) return [];
  const s = normalizeRaw(raw);

  // "toute l'année" / "toutes saisons" / "toutes" / "annee"
  if (
    s.includes("toute") ||
    s.includes("toutes") ||
    s.includes("annee") ||
    s === "tout" ||
    s === "an"
  ) {
    return ["printemps", "été", "automne", "hiver"];
  }

  const result: Season[] = [];
  if (s.includes("printemps")) result.push("printemps");
  // "ete" = "été" sans accent ; vérifie que ce n'est pas un simple "et" isolé
  if (/\bete\b/.test(s) || s === "ete") result.push("été");
  if (s.includes("automne")) result.push("automne");
  if (s.includes("hiver")) result.push("hiver");
  return result;
}

/**
 * Vérifie si une recette (via sa colonne `saison`) est compatible avec une saison donnée.
 * Retourne false si la colonne est absente ou vide (→ utiliser l'autre logique).
 */
export function matchesSeason(
  recipeSaison: string | null | undefined,
  season: Season
): boolean {
  const normalized = normalizeSeason(recipeSaison);
  if (normalized.length === 0) return false;
  return normalized.includes(season);
}

/**
 * Score de pertinence saisonnière (0-35).
 *
 * Priorité 1 — colonne DB `saison` :
 *   - Saison exacte              → 35 pts
 *   - "Toute l'année"            → 20 pts
 *   - Saison adjacente seulement → 10 pts  (ex. hiver si on est en automne)
 *   - Mauvaise saison            →  0 pts
 *
 * Priorité 2 — fallback ingrédients (ancienne logique, si colonne absente) :
 *   - Ingrédient saisonnier trouvé → 15 pts
 *   - Aucun match                  →  0 pts
 */
export function scoreRecipeSeasonRelevance(
  recipe: { saison?: string | null; ingredients: string | null },
  season: Season
): number {
  const raw = recipe.saison;

  if (raw != null && raw.trim() !== "") {
    const s = normalizeRaw(raw);

    // "Toute l'année"
    if (s.includes("toute") || s.includes("toutes") || s.includes("annee")) return 20;

    const normalized = normalizeSeason(raw);
    if (normalized.includes(season)) return 35; // match parfait

    // Saison adjacente (transition saisonnière)
    const ADJACENT: Record<Season, Season[]> = {
      printemps: ["hiver", "été"],
      été:       ["printemps", "automne"],
      automne:   ["été", "hiver"],
      hiver:     ["automne", "printemps"],
    };
    if (ADJACENT[season].some((adj) => normalized.includes(adj))) return 10;

    return 0; // mauvaise saison
  }

  // Fallback : détection par ingrédients (moins fiable)
  return isRecipeSeasonal(recipe, season) ? 15 : 0;
}

/**
 * Filtre les recettes par saison avec fallback progressif.
 *
 * Ordre de priorité :
 *   1. Recettes dont `saison` contient la saison courante
 *   2. Recettes "toute l'année" (si step 1 vide)
 *   3. Toutes les recettes (si les deux précédents vides)
 */
export function filterRecipesBySeasonSmart<
  T extends { saison?: string | null; ingredients: string | null }
>(recipes: T[], season?: Season): T[] {
  const current = season ?? getCurrentSeason();

  const exact = recipes.filter((r) => {
    if (r.saison != null && r.saison.trim() !== "") return matchesSeason(r.saison, current);
    return isRecipeSeasonal(r, current); // fallback ingrédients
  });
  if (exact.length > 0) return exact;

  const allYear = recipes.filter((r) => {
    if (!r.saison?.trim()) return false;
    const s = normalizeRaw(r.saison);
    return s.includes("toute") || s.includes("toutes") || s.includes("annee");
  });
  if (allYear.length > 0) return allYear;

  return recipes;
}




