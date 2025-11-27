// Filtrage automatique des recettes selon la saison

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
export function isRecipeSeasonal(recipe: { ingredients: string }, season: Season): boolean {
  const ingredientsLower = recipe.ingredients.toLowerCase();
  const seasonalIngredients = SEASONAL_INGREDIENTS[season];

  // Vérifier si au moins un ingrédient de saison est présent
  return seasonalIngredients.some((ingredient) =>
    ingredientsLower.includes(ingredient.toLowerCase())
  );
}

// Filtrer les recettes selon la saison actuelle
export function filterRecipesBySeason<T extends { ingredients: string }>(
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




