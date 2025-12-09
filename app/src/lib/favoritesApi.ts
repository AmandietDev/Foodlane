/**
 * API pour gérer les favoris et collections de recettes dans Supabase
 * Toutes les fonctions nécessitent un utilisateur connecté
 */

import { supabase } from "./supabaseClient";
import type { Recipe } from "./recipes";

/**
 * Récupère toutes les recettes favorites de l'utilisateur connecté
 * @returns Promise<Recipe[]> - Liste des recettes favorites
 * @throws Error si l'utilisateur n'est pas connecté ou en cas d'erreur Supabase
 */
export async function getUserFavorites(): Promise<Recipe[]> {
  // Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Utilisateur non connecté");
  }

  // Récupérer les IDs des recettes favorites depuis saved_recipes
  const { data: savedRecipes, error: savedError } = await supabase
    .from("saved_recipes")
    .select("recipe_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (savedError) {
    console.error("[FavoritesAPI] Erreur lors de la récupération des favoris:", savedError);
    throw new Error(`Impossible de récupérer les favoris: ${savedError.message}`);
  }

  if (!savedRecipes || savedRecipes.length === 0) {
    return [];
  }

  // Récupérer les détails complets des recettes depuis la table recipes
  const recipeIds = savedRecipes.map((sr) => sr.recipe_id);
  
  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select("*")
    .in("id", recipeIds);

  if (recipesError) {
    console.error("[FavoritesAPI] Erreur lors de la récupération des détails des recettes:", recipesError);
    // Si la table recipes n'existe pas ou n'a pas les recettes, on retourne des objets partiels
    // avec juste l'ID (l'app devra charger les détails depuis ailleurs)
    return recipeIds.map((id) => ({ id } as Recipe));
  }

  // Mapper les données Supabase vers le format Recipe
  return (recipes || []).map((r: any) => ({
    id: r.id?.toString() || "",
    type: r.type || "",
    difficulte: r.difficulte || "",
    temps_preparation_min: r.temps_preparation_min || 0,
    categorie_temps: r.categorie_temps || "",
    nb_personnes: r.nb_personnes || 0,
    nom: r.nom || "",
    description_courte: r.description_courte || "",
    ingredients: r.ingredients || "",
    instructions: r.instructions || "",
    equipements: r.equipements || "",
    calories: r.calories,
    image_url: r.image_url,
  }));
}

/**
 * Ajoute une recette aux favoris de l'utilisateur connecté
 * @param recipeId - ID de la recette à ajouter
 * @throws Error si l'utilisateur n'est pas connecté ou en cas d'erreur Supabase
 */
export async function addFavorite(recipeId: string): Promise<void> {
  // Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Utilisateur non connecté");
  }

  // Insérer dans saved_recipes (user_id sera automatiquement rempli par auth.uid())
  const { error } = await supabase
    .from("saved_recipes")
    .insert({
      recipe_id: recipeId,
      // user_id est automatiquement rempli par la default value auth.uid()
    });

  if (error) {
    // Si l'erreur est due à une contrainte unique (recette déjà en favoris), on ignore
    if (error.code === "23505") {
      console.log("[FavoritesAPI] La recette est déjà en favoris");
      return;
    }
    console.error("[FavoritesAPI] Erreur lors de l'ajout du favori:", error);
    throw new Error(`Impossible d'ajouter aux favoris: ${error.message}`);
  }

  console.log(`[FavoritesAPI] ✅ Recette ${recipeId} ajoutée aux favoris`);
}

/**
 * Retire une recette des favoris de l'utilisateur connecté
 * @param recipeId - ID de la recette à retirer
 * @throws Error si l'utilisateur n'est pas connecté ou en cas d'erreur Supabase
 */
export async function removeFavorite(recipeId: string): Promise<void> {
  // Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Utilisateur non connecté");
  }

  // Supprimer de saved_recipes
  const { error } = await supabase
    .from("saved_recipes")
    .delete()
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId);

  if (error) {
    console.error("[FavoritesAPI] Erreur lors de la suppression du favori:", error);
    throw new Error(`Impossible de retirer des favoris: ${error.message}`);
  }

  console.log(`[FavoritesAPI] ✅ Recette ${recipeId} retirée des favoris`);
}

/**
 * Interface pour une collection de recettes
 */
export interface UserCollection {
  id: string;
  name: string;
  recipeIds: string[];
  createdAt: number;
}

/**
 * Récupère toutes les collections de l'utilisateur connecté avec leurs recettes
 * @returns Promise<UserCollection[]> - Liste des collections avec leurs recettes
 * @throws Error si l'utilisateur n'est pas connecté ou en cas d'erreur Supabase
 */
export async function getUserCollections(): Promise<UserCollection[]> {
  // Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Utilisateur non connecté");
  }

  // Récupérer les collections de l'utilisateur
  const { data: collections, error: collectionsError } = await supabase
    .from("recipe_collections")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (collectionsError) {
    console.error("[FavoritesAPI] Erreur lors de la récupération des collections:", collectionsError);
    throw new Error(`Impossible de récupérer les collections: ${collectionsError.message}`);
  }

  if (!collections || collections.length === 0) {
    return [];
  }

  // Pour chaque collection, récupérer les recettes associées
  const collectionsWithRecipes: UserCollection[] = await Promise.all(
    collections.map(async (collection) => {
      const { data: collectionRecipes, error: recipesError } = await supabase
        .from("collection_recipes")
        .select("recipe_id")
        .eq("collection_id", collection.id);

      if (recipesError) {
        console.error(`[FavoritesAPI] Erreur lors de la récupération des recettes de la collection ${collection.id}:`, recipesError);
        return {
          id: collection.id,
          name: collection.name,
          recipeIds: [],
          createdAt: new Date(collection.created_at).getTime(),
        };
      }

      return {
        id: collection.id,
        name: collection.name,
        recipeIds: collectionRecipes?.map((cr) => cr.recipe_id) || [],
        createdAt: new Date(collection.created_at).getTime(),
      };
    })
  );

  return collectionsWithRecipes;
}

/**
 * Crée une nouvelle collection pour l'utilisateur connecté
 * @param name - Nom de la collection
 * @returns Promise<string> - ID de la collection créée
 * @throws Error si l'utilisateur n'est pas connecté ou en cas d'erreur Supabase
 */
export async function createCollection(name: string): Promise<string> {
  // Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Utilisateur non connecté");
  }

  // Insérer dans recipe_collections (user_id sera automatiquement rempli par auth.uid())
  const { data, error } = await supabase
    .from("recipe_collections")
    .insert({
      name: name.trim(),
      // user_id est automatiquement rempli par la default value auth.uid()
    })
    .select("id")
    .single();

  if (error) {
    console.error("[FavoritesAPI] Erreur lors de la création de la collection:", error);
    throw new Error(`Impossible de créer la collection: ${error.message}`);
  }

  if (!data) {
    throw new Error("La collection a été créée mais aucun ID n'a été retourné");
  }

  console.log(`[FavoritesAPI] ✅ Collection "${name}" créée avec l'ID ${data.id}`);
  return data.id;
}

/**
 * Ajoute une recette à une collection
 * @param collectionId - ID de la collection
 * @param recipeId - ID de la recette à ajouter
 * @throws Error si l'utilisateur n'est pas connecté ou en cas d'erreur Supabase
 */
export async function addRecipeToCollection(collectionId: string, recipeId: string): Promise<void> {
  // Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Utilisateur non connecté");
  }

  // Vérifier que la collection appartient à l'utilisateur (sécurité supplémentaire)
  const { data: collection, error: collectionError } = await supabase
    .from("recipe_collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .single();

  if (collectionError || !collection) {
    throw new Error("Collection introuvable ou vous n'avez pas les droits");
  }

  // Insérer dans collection_recipes
  const { error } = await supabase
    .from("collection_recipes")
    .insert({
      collection_id: collectionId,
      recipe_id: recipeId,
    });

  if (error) {
    // Si l'erreur est due à une contrainte unique (recette déjà dans la collection), on ignore
    if (error.code === "23505") {
      console.log("[FavoritesAPI] La recette est déjà dans la collection");
      return;
    }
    console.error("[FavoritesAPI] Erreur lors de l'ajout de la recette à la collection:", error);
    throw new Error(`Impossible d'ajouter la recette à la collection: ${error.message}`);
  }

  console.log(`[FavoritesAPI] ✅ Recette ${recipeId} ajoutée à la collection ${collectionId}`);
}

/**
 * Retire une recette d'une collection
 * @param collectionId - ID de la collection
 * @param recipeId - ID de la recette à retirer
 * @throws Error si l'utilisateur n'est pas connecté ou en cas d'erreur Supabase
 */
export async function removeRecipeFromCollection(collectionId: string, recipeId: string): Promise<void> {
  // Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Utilisateur non connecté");
  }

  // Vérifier que la collection appartient à l'utilisateur (sécurité supplémentaire)
  const { data: collection, error: collectionError } = await supabase
    .from("recipe_collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .single();

  if (collectionError || !collection) {
    throw new Error("Collection introuvable ou vous n'avez pas les droits");
  }

  // Supprimer de collection_recipes
  const { error } = await supabase
    .from("collection_recipes")
    .delete()
    .eq("collection_id", collectionId)
    .eq("recipe_id", recipeId);

  if (error) {
    console.error("[FavoritesAPI] Erreur lors de la suppression de la recette de la collection:", error);
    throw new Error(`Impossible de retirer la recette de la collection: ${error.message}`);
  }

  console.log(`[FavoritesAPI] ✅ Recette ${recipeId} retirée de la collection ${collectionId}`);
}

/**
 * Supprime une collection et toutes ses recettes associées
 * @param collectionId - ID de la collection à supprimer
 * @throws Error si l'utilisateur n'est pas connecté ou en cas d'erreur Supabase
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  // Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Utilisateur non connecté");
  }

  // Supprimer la collection (les recettes associées seront supprimées automatiquement si ON DELETE CASCADE est configuré)
  const { error } = await supabase
    .from("recipe_collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[FavoritesAPI] Erreur lors de la suppression de la collection:", error);
    throw new Error(`Impossible de supprimer la collection: ${error.message}`);
  }

  console.log(`[FavoritesAPI] ✅ Collection ${collectionId} supprimée`);
}

/**
 * Met à jour le nom d'une collection
 * @param collectionId - ID de la collection
 * @param name - Nouveau nom
 * @throws Error si l'utilisateur n'est pas connecté ou en cas d'erreur Supabase
 */
export async function updateCollection(collectionId: string, name: string): Promise<void> {
  // Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Utilisateur non connecté");
  }

  // Mettre à jour la collection
  const { error } = await supabase
    .from("recipe_collections")
    .update({ name: name.trim() })
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[FavoritesAPI] Erreur lors de la mise à jour de la collection:", error);
    throw new Error(`Impossible de mettre à jour la collection: ${error.message}`);
  }

  console.log(`[FavoritesAPI] ✅ Collection ${collectionId} mise à jour`);
}

