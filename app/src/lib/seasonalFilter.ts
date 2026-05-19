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

/**
 * @deprecated Préférer `filterRecipesBySeasonSmart` — même nom conservé pour l’existant.
 * Délègue à la logique centralisée (colonne `saison` + fallback ingrédients + élargissements).
 */
export function filterRecipesBySeason<
  T extends { saison?: string | null; ingredients: string | null }
>(recipes: T[], season?: Season): T[] {
  return filterRecipesBySeasonSmart(recipes, season);
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

/** Saisons « voisines » pour transitions (ex. fin d’hiver / début de printemps). */
export const ADJACENT_SEASONS: Record<Season, Season[]> = {
  printemps: ["hiver", "été"],
  été: ["printemps", "automne"],
  automne: ["été", "hiver"],
  hiver: ["automne", "printemps"],
};

/**
 * Recette étiquetée pour une saison adjacente à la période courante (sans match direct ni « toute l’année »).
 */
export function matchesSeasonAdjacent(
  recipeSaison: string | null | undefined,
  season: Season
): boolean {
  const raw = recipeSaison?.trim();
  if (!raw) return false;
  const s = normalizeRaw(raw);
  if (s.includes("toute") || s.includes("toutes") || s.includes("annee")) return false;
  const normalized = normalizeSeason(recipeSaison);
  if (normalized.length === 0) return false;
  if (normalized.includes(season)) return false;
  return ADJACENT_SEASONS[season].some((adj) => normalized.includes(adj));
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

    if (ADJACENT_SEASONS[season].some((adj) => normalized.includes(adj))) return 10;

    return 0; // mauvaise saison
  }

  // Fallback : détection par ingrédients (moins fiable)
  return isRecipeSeasonal(recipe, season) ? 15 : 0;
}

/**
 * Retourne true si la recette possède un champ `saison` explicite dont
 * TOUTES les saisons parsées sont hors de {saison courante ∪ saisons adjacentes}.
 * Les recettes sans tag, ou taggées "toute l'année", ne sont jamais « explicitement hors-saison ».
 */
export function isExplicitlyWrongSeason(
  recipe: { saison?: string | null },
  season: Season
): boolean {
  const raw = recipe.saison?.trim();
  if (!raw) return false;
  const s = normalizeRaw(raw);
  if (s.includes("toute") || s.includes("toutes") || s.includes("annee")) return false;
  const normalized = normalizeSeason(raw);
  if (normalized.length === 0) return false;
  const acceptable = new Set<Season>([season, ...ADJACENT_SEASONS[season]]);
  return !normalized.some((ns) => acceptable.has(ns));
}

/** Exclut toutes les recettes explicitement hors-saison (tag DB non-ambigu). */
export function filterRecipesExcludeWrongSeason<
  T extends { saison?: string | null }
>(recipes: T[], season: Season): T[] {
  return recipes.filter((r) => !isExplicitlyWrongSeason(r, season));
}

/**
 * Filtre DUR pour le pool saisonnier — conserve uniquement :
 *   - recettes taggées avec la saison courante (ex. "printemps", "printemps été")
 *   - recettes "toute l'année"
 *   - recettes sans tag saison (neutrales)
 *
 * Exclut toutes les recettes taggées avec n'importe quelle autre saison spécifique,
 * y compris les saisons adjacentes. C'est l'exclusion absolue demandée par seasonal_preference.
 */
export function filterRecipesForSeasonalPool<
  T extends { saison?: string | null; ingredients: string | null }
>(recipes: T[], season: Season): T[] {
  return recipes.filter((r) => {
    const raw = r.saison?.trim();
    if (!raw) return true; // pas de tag → neutral, on garde
    const s = normalizeRaw(raw);
    if (s.includes("toute") || s.includes("toutes") || s.includes("annee")) return true;
    const normalized = normalizeSeason(raw);
    if (normalized.length === 0) return true; // tag non parseable → neutral
    return normalized.includes(season); // uniquement si tag contient la saison courante
  });
}

/**
 * Filtre les recettes par saison avec fallback progressif.
 *
 * Ordre de priorité :
 *   1. Recettes dont `saison` contient la saison courante, ou sans `saison` mais ingrédients de saison
 *   2. Recettes « toute l'année »
 *   3. Recettes saison adjacentes (colonne DB uniquement)
 *   4. Toutes les recettes (dernier recours — évite liste vide)
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

  const adjacent = recipes.filter(
    (r) => r.saison?.trim() && matchesSeasonAdjacent(r.saison, current)
  );
  if (adjacent.length > 0) return adjacent;

  return recipes;
}




