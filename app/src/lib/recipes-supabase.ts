// Fonction pour récupérer les recettes depuis Supabase
import { supabase } from './supabase';
import type { Recipe } from './recipes';

/**
 * Récupère toutes les recettes depuis Supabase
 */
export async function fetchRecipesFromSupabase(): Promise<Recipe[]> {
  try {
    console.log('[Recipes] Récupération des recettes depuis Supabase (pagination)...');

    const PAGE_SIZE = 1000;
    let allRows: Record<string, unknown>[] = [];
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

    // Transformer les données Supabase en format Recipe
    const recipes: Recipe[] = data.map((row) => ({
      id: Number(row.id),
      type: row.type ?? null,
      difficulte: row.difficulte ?? null,
      temps_preparation_min: row.temps_preparation_min ?? null,
      categorie_temps: row.categorie_temps ?? null,
      nombre_personnes: row.nombre_personnes ?? null,
      nom_recette: row.nom_recette ?? null,
      description_courte: row.description_courte ?? null,
      ingredients: row.ingredients ?? null,
      instructions: row.instructions ?? null,
      equipements: row.equipements ?? null,
      calories: row.calories ?? null,
      image_url: row.image_url ?? null,
      created_at: row.created_at ?? new Date().toISOString(),
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

