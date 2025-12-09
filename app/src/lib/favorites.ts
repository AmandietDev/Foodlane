import type { Recipe } from "./recipes";
import { supabase } from "./supabaseClient";
import * as favoritesApi from "./favoritesApi";

export const FAVORITES_STORAGE_KEY = "foodlane_favorites";

/**
 * Charge les favoris depuis Supabase pour l'utilisateur connecté
 * Utilise localStorage comme cache de secours si non connecté
 */
export async function loadFavorites(): Promise<Recipe[]> {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    // Vérifier si l'utilisateur est connecté
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      // Pas connecté : utiliser localStorage comme avant
      console.log("[Favorites] Utilisateur non connecté, chargement depuis localStorage");
      return loadFavoritesFromLocalStorage();
    }

    // Utilisateur connecté : charger depuis Supabase via l'API
    try {
      const favorites = await favoritesApi.getUserFavorites();
      console.log(`[Favorites] ✅ Chargé ${favorites.length} favoris depuis Supabase`);
      
      // Mettre à jour le cache localStorage pour performance
      saveFavoritesToLocalStorage(favorites);
      
      return favorites;
    } catch (apiError) {
      console.error("[Favorites] Erreur lors du chargement depuis l'API:", apiError);
      // Fallback sur localStorage en cas d'erreur
      return loadFavoritesFromLocalStorage();
    }
  } catch (error) {
    console.error("[Favorites] Erreur lors du chargement:", error);
    return loadFavoritesFromLocalStorage();
  }
}

/**
 * Charge les favoris depuis localStorage (fonction de secours)
 */
function loadFavoritesFromLocalStorage(): Recipe[] {
  try {
    const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored) as Recipe[];
    return parsed;
  } catch (error) {
    console.error("[Favorites] Erreur lors du chargement depuis localStorage:", error);
    return [];
  }
}

/**
 * Sauvegarde les favoris dans localStorage (cache)
 */
function saveFavoritesToLocalStorage(favorites: Recipe[]): void {
  try {
    const serialized = JSON.stringify(favorites);
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, serialized);
  } catch (error) {
    console.error("[Favorites] Erreur lors de la sauvegarde dans localStorage:", error);
  }
}

/**
 * Sauvegarde les favoris dans Supabase pour l'utilisateur connecté
 * Met aussi à jour localStorage comme cache
 * Note: Cette fonction synchronise toute la liste. Pour ajouter/retirer un seul favori,
 * utilisez addFavorite() ou removeFavorite() qui sont plus efficaces.
 */
export async function saveFavorites(favorites: Recipe[]): Promise<void> {
  if (typeof window === "undefined") {
    console.warn("[Favorites] saveFavorites appelé côté serveur, ignoré");
    return;
  }

  try {
    // Vérifier que les recettes sont valides
    const validFavorites = favorites.filter(recipe => {
      if (!recipe || !recipe.id) {
        console.warn("[Favorites] Recette invalide ignorée:", recipe);
        return false;
      }
      return true;
    });

    // Sauvegarder dans localStorage comme cache
    saveFavoritesToLocalStorage(validFavorites);

    // Vérifier si l'utilisateur est connecté
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log("[Favorites] Utilisateur non connecté, sauvegarde uniquement dans localStorage");
      // Déclencher l'événement même si pas connecté
      window.dispatchEvent(new CustomEvent("favoritesUpdated", { 
        detail: { favorites: validFavorites } 
      }));
      return;
    }

    // Utilisateur connecté : synchroniser avec Supabase
    // Récupérer les favoris actuels depuis Supabase
    const currentFavorites = await favoritesApi.getUserFavorites();
    const currentIds = currentFavorites.map((f) => f.id);
    const newIds = validFavorites.map((r) => r.id);

    // Identifier les favoris à ajouter et à supprimer
    const toAdd = newIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !newIds.includes(id));

    // Ajouter les nouveaux favoris un par un (l'API gère les doublons)
    for (const recipeId of toAdd) {
      try {
        await favoritesApi.addFavorite(recipeId);
      } catch (error) {
        console.error(`[Favorites] Erreur lors de l'ajout du favori ${recipeId}:`, error);
      }
    }

    // Supprimer les favoris retirés
    for (const recipeId of toRemove) {
      try {
        await favoritesApi.removeFavorite(recipeId);
      } catch (error) {
        console.error(`[Favorites] Erreur lors de la suppression du favori ${recipeId}:`, error);
      }
    }

    // Déclencher un événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new CustomEvent("favoritesUpdated", { 
      detail: { favorites: validFavorites } 
    }));

    console.log(`[Favorites] ✅ Synchronisé ${validFavorites.length} favoris avec Supabase`);
  } catch (error) {
    console.error("[Favorites] ❌ Erreur lors de la sauvegarde des favoris:", error);
    if (error instanceof Error) {
      console.error("[Favorites] Détails de l'erreur:", error.message, error.stack);
    }
  }
}

/**
 * Ajoute une recette aux favoris
 * Si l'utilisateur est connecté, utilise l'API Supabase directement
 * Sinon, utilise localStorage
 */
export async function addFavorite(recipe: Recipe): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // Vérifier si l'utilisateur est connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Utilisateur connecté : utiliser l'API Supabase
    try {
      await favoritesApi.addFavorite(recipe.id);
      
      // Mettre à jour le cache localStorage
      const favorites = await loadFavorites();
      if (!favorites.find((f) => f.id === recipe.id)) {
        saveFavoritesToLocalStorage([...favorites, recipe]);
      }
      
      // Déclencher l'événement
      window.dispatchEvent(new CustomEvent("favoritesUpdated"));
    } catch (error) {
      console.error("[Favorites] Erreur lors de l'ajout du favori:", error);
      throw error;
    }
  } else {
    // Non connecté : utiliser localStorage
    const favorites = await loadFavorites();
    if (!favorites.find((f) => f.id === recipe.id)) {
      await saveFavorites([...favorites, recipe]);
    }
  }
}

/**
 * Supprime une recette des favoris
 * Si l'utilisateur est connecté, utilise l'API Supabase directement
 * Sinon, utilise localStorage
 */
export async function removeFavorite(recipeId: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // Vérifier si l'utilisateur est connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Utilisateur connecté : utiliser l'API Supabase
    try {
      await favoritesApi.removeFavorite(recipeId);
      
      // Mettre à jour le cache localStorage
      const favorites = await loadFavorites();
      saveFavoritesToLocalStorage(favorites.filter((f) => f.id !== recipeId));
      
      // Déclencher l'événement
      window.dispatchEvent(new CustomEvent("favoritesUpdated"));
    } catch (error) {
      console.error("[Favorites] Erreur lors de la suppression du favori:", error);
      throw error;
    }
  } else {
    // Non connecté : utiliser localStorage
    const favorites = await loadFavorites();
    await saveFavorites(favorites.filter((f) => f.id !== recipeId));
  }
}

/**
 * Vérifie si une recette est en favoris
 */
export async function isFavorite(recipeId: string): Promise<boolean> {
  const favorites = await loadFavorites();
  return favorites.some((f) => f.id === recipeId);
}






