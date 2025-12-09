// Fonction pour récupérer les recettes depuis Supabase
import { supabase } from './supabase';
import type { Recipe } from './recipes';

/**
 * Récupère toutes les recettes depuis Supabase
 */
export async function fetchRecipesFromSupabase(): Promise<Recipe[]> {
  try {
    console.log('[Recipes] Récupération des recettes depuis Supabase...');

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('nom', { ascending: true });

    if (error) {
      console.error('[Recipes] Erreur Supabase:', error);
      throw new Error(`Erreur lors de la récupération des recettes: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.warn('[Recipes] Aucune recette trouvée dans Supabase');
      return [];
    }

    // Transformer les données Supabase en format Recipe
    const recipes: Recipe[] = data.map((row) => ({
      id: row.id || '',
      type: row.type || '',
      difficulte: row.difficulte || '',
      temps_preparation_min: row.temps_preparation_min || 0,
      categorie_temps: row.categorie_temps || '',
      nb_personnes: row.nb_personnes || 1,
      nom: row.nom || '',
      description_courte: row.description_courte || '',
      ingredients: row.ingredients || '',
      instructions: row.instructions || '',
      equipements: row.equipements || '',
      calories: row.calories || undefined,
      image_url: row.image_url || undefined,
    }));

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

