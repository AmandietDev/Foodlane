// Fonction pour récupérer les recettes depuis Supabase
import { supabase } from './supabase';
import type { Recipe } from './recipes';
import { deriveRecipeFeatures } from "./recipeFeatures";

/**
 * Récupère toutes les recettes depuis Supabase
 */
export async function fetchRecipesFromSupabase(): Promise<Recipe[]> {
  try {
    console.log('[Recipes] Récupération des recettes depuis Supabase (pagination)...');

    const PAGE_SIZE = 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allRows: any[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('recipes_v2')
        .select('*')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('[Recipes] Erreur Supabase:', error);
        throw new Error(`Erreur lors de la récupération des recettes: ${error.message}`);
      }

      if (!data || data.length === 0) break;

      allRows = allRows.concat(data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    const data = allRows;

    if (data.length === 0) {
      console.warn('[Recipes] Aucune recette trouvée dans Supabase');
      return [];
    }

    // Transformer les données Supabase en format Recipe.
    // On lit les nouveaux noms de colonnes recipes_v2 en priorité, puis les anciens
    // en fallback. Les colonnes manquantes restent à null sans faire planter.
    const recipes: Recipe[] = data.map((row) => {
      // Lecture défensive : on supporte ingredients_quantites (nouveau) ET ingredients (legacy)
      const ingredientsRaw = row.ingredients_quantites ?? row.ingredients ?? null;
      const equipementsRaw = row.equipements_necessaires ?? row.equipements ?? null;
      const caloriesRaw = row.calories_par_portion ?? row.calories ?? null;

      // Heuristiques de fallback uniquement si les colonnes structurées sont vides
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

        // Colonnes structurées recipes_v2 (source of truth quand renseignées)
        meal_slot: row.meal_slot ?? null,
        dish_type: row.dish_type ?? null,
        main_protein: row.main_protein ?? null,
        main_carb: row.main_carb ?? null,
        main_vegetables: row.main_vegetables ?? null,
        allergens: row.allergens ?? null,
        igredient_tags: row.igredient_tags ?? null,
        diet_tags: row.diet_tags ?? null,

        // Métadonnées dérivées (DB en priorité, sinon heuristique)
        family: row.family ?? features.family,
        cooking_method: row.cooking_method ?? features.cooking_method,
        texture: row.texture ?? features.texture,
        meal_subtype: row.meal_subtype ?? features.meal_subtype,

        // Ingrédients / nutrition (legacy + nouveau)
        ingredients: ingredientsRaw,
        ingredients_quantites: row.ingredients_quantites ?? null,
        instructions: row.instructions ?? null,
        equipements: equipementsRaw,
        equipements_necessaires: row.equipements_necessaires ?? null,
        calories: caloriesRaw,
        calories_par_portion: row.calories_par_portion ?? null,

        image_url: row.image_url ?? null,
        created_at: row.created_at ?? new Date().toISOString(),
      };
    });

    // Log pour vérifier la répartition par type
    const sweetCount = recipes.filter((r) => {
      const type = (r.type?.toLowerCase() || '').trim();
      return type.includes('sucré') || type.includes('sucree') || type.includes('sucr');
    }).length;
    const savoryCount = recipes.filter((r) => {
      const type = (r.type?.toLowerCase() || '').trim();
      return type.includes('salé') || type.includes('sale') || type.includes('sal');
    }).length;

    console.log(
      `[Recipes] ${recipes.length} recettes récupérées depuis Supabase (${sweetCount} sucrées, ${savoryCount} salées)`
    );

    return recipes;
  } catch (error) {
    console.error('[Recipes] Erreur lors de la récupération des recettes depuis Supabase:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erreur inconnue lors de la récupération des recettes depuis Supabase');
  }
}

