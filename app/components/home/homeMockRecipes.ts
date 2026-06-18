import type { Recipe } from "../../src/lib/recipes";

const mockBase = {
  difficulte: "facile",
  categorie_temps: null,
  nombre_personnes: 4,
  description_courte: null,
  ingredients: null,
  instructions: null,
  equipements: null,
  calories: null,
  created_at: "",
} satisfies Partial<Recipe>;

/** Fallback si l'API ne renvoie rien */
export const HOME_MOCK_RECIPES: Recipe[] = [
  {
    ...mockBase,
    id: 9001,
    type: "plat",
    temps_preparation_min: 35,
    nom_recette: "Soupe tomates & grilled cheese",
    dish_type: "soupe",
    image_url: "/favorites-recipes-hero-02b30ddf.png",
  },
  {
    ...mockBase,
    id: 9002,
    type: "plat",
    temps_preparation_min: 25,
    nombre_personnes: 2,
    nom_recette: "Bowl poulet & avocat",
    dish_type: "bowl",
    image_url: "/recipes-explore-banner-229d46d1.png",
  },
  {
    ...mockBase,
    id: 9003,
    type: "plat",
    temps_preparation_min: 40,
    nom_recette: "Pâtes crémeuses aux champignons",
    dish_type: "plat principal",
    image_url: "/menu-generation-collage.png",
  },
];

export function recipeDisplayTag(recipe: Recipe): { label: string; icon: string } {
  const raw = `${recipe.dish_type || ""} ${recipe.type || ""}`.toLowerCase();
  if (raw.includes("dessert") || raw.includes("sucré") || raw.includes("gateau")) {
    return { label: "Dessert", icon: "🍰" };
  }
  if (raw.includes("complet") || raw.includes("bowl") || raw.includes("plat principal")) {
    return { label: "Complet", icon: "🍽️" };
  }
  if (raw.includes("simple") || raw.includes("rapide") || raw.includes("soupe")) {
    return { label: "Simple", icon: "🥣" };
  }
  return { label: "Salé", icon: "🍴" };
}
