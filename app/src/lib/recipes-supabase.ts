// Fonction pour récupérer les recettes depuis Supabase
import { supabase } from "./supabase";
import type { Recipe } from "./recipes";
import { deriveRecipeFeatures } from "./recipeFeatures";

/**
 * Colonnes nécessaires au moteur de planification.
 * `instructions` est délibérément absent : il n'est jamais utilisé pour le
 * scoring ou le filtrage et représente ~40% du payload total.
 * La fiche détail recette (/api/recipes/[id]) continue d'utiliser SELECT *.
 */
const PLANNING_SELECT = [
  "id", "type", "difficulte", "temps_preparation_min", "categorie_temps",
  "nombre_personnes", "nom_recette", "description_courte", "saison",
  "meal_slot", "dish_type", "main_protein", "main_carb", "main_vegetables",
  "allergens", "igredient_tags", "diet_tags",
  "family", "cooking_method", "texture", "meal_subtype",
  "ingredients", "ingredients_quantites",
  "equipements", "equipements_necessaires",
  "calories", "calories_par_portion",
  "image_url", "created_at",
].join(", ");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSupabaseRowToRecipe(row: any): Recipe {
  const ingredientsRaw = row.ingredients_quantites ?? row.ingredients ?? null;
  const equipementsRaw = row.equipements_necessaires ?? row.equipements ?? null;
  const caloriesRaw = row.calories_par_portion ?? row.calories ?? null;

  const features = deriveRecipeFeatures({
    nom_recette: row.nom_recette ?? null,
    type: row.type ?? null,
    ingredients: ingredientsRaw,
    instructions: row.instructions ?? null,
    family: row.family ?? null,
    cooking_method: row.cooking_method ?? null,
    texture: row.texture ?? null,
    meal_subtype: row.meal_subtype ?? null,
  });

  return {
    id: Number(row.id),
    type: row.type ?? null,
    difficulte: row.difficulte ?? null,
    temps_preparation_min: row.temps_preparation_min ?? null,
    categorie_temps: row.categorie_temps ?? null,
    nombre_personnes: row.nombre_personnes ?? null,
    nom_recette: row.nom_recette ?? null,
    description_courte: row.description_courte ?? null,
    saison: row.saison ?? null,

    meal_slot: row.meal_slot ?? null,
    dish_type: row.dish_type ?? null,
    main_protein: row.main_protein ?? null,
    main_carb: row.main_carb ?? null,
    main_vegetables: row.main_vegetables ?? null,
    allergens: row.allergens ?? null,
    igredient_tags: row.igredient_tags ?? null,
    diet_tags: row.diet_tags ?? null,

    family: row.family ?? features.family,
    cooking_method: row.cooking_method ?? features.cooking_method,
    texture: row.texture ?? features.texture,
    meal_subtype: row.meal_subtype ?? features.meal_subtype,

    ingredients: ingredientsRaw,
    ingredients_quantites: row.ingredients_quantites ?? null,
    instructions: row.instructions ?? null, // null pour fetchRecipesFromSupabase (non chargé)
    equipements: equipementsRaw,
    equipements_necessaires: row.equipements_necessaires ?? null,
    calories: caloriesRaw,
    calories_par_portion: row.calories_par_portion ?? null,

    image_url: row.image_url ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

/** Une seule recette par id (pour fiche /api/recipes/[id]). */
export async function fetchRecipeByIdFromSupabase(id: number): Promise<Recipe | null> {
  const { data, error } = await supabase.from("recipes_v2").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[Recipes] fetchRecipeByIdFromSupabase:", error.message);
    return null;
  }
  if (!data) return null;
  return mapSupabaseRowToRecipe(data);
}

/**
 * Récupère toutes les recettes depuis Supabase en une seule requête.
 *
 * Optimisations vs version précédente :
 *  - SELECT limité aux colonnes utiles (pas d'instructions → ~40% de payload en moins)
 *  - range(0, 4999) : une seule requête HTTP au lieu d'une boucle paginée (2×)
 */
export async function fetchRecipesFromSupabase(): Promise<Recipe[]> {
  const t0 = Date.now();
  const { data, error } = await supabase
    .from("recipes_v2")
    .select(PLANNING_SELECT)
    .order("id", { ascending: true })
    .range(0, 4999);

  if (error) {
    console.error("[Recipes] Erreur Supabase:", error.message);
    throw new Error(`Erreur Supabase: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn("[Recipes] Aucune recette trouvée dans Supabase");
    return [];
  }

  const recipes: Recipe[] = data.map((row) => mapSupabaseRowToRecipe(row));
  console.log(`[Recipes] ${recipes.length} recettes chargées depuis Supabase en ${Date.now() - t0}ms`);
  return recipes;
}

