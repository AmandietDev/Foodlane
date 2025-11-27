import type { Recipe } from "./recipes";

export const FAVORITES_STORAGE_KEY = "foodlane_favorites";

export function loadFavorites(): Recipe[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) {
      console.log("[Favorites] Aucun favori trouvé dans localStorage");
      return [];
    }
    const parsed = JSON.parse(stored) as Recipe[];
    console.log(`[Favorites] Chargé ${parsed.length} favoris depuis localStorage`, parsed);
    return parsed;
  } catch (error) {
    console.error("Impossible de charger les favoris :", error);
    return [];
  }
}

export function saveFavorites(favorites: Recipe[]): void {
  if (typeof window === "undefined") {
    console.warn("[Favorites] saveFavorites appelé côté serveur, ignoré");
    return;
  }

  try {
    // Vérifier que localStorage est disponible
    if (!window.localStorage) {
      console.error("[Favorites] localStorage n'est pas disponible");
      return;
    }

    // Vérifier que les recettes sont valides
    const validFavorites = favorites.filter(recipe => {
      if (!recipe || !recipe.id || !recipe.nom) {
        console.warn("[Favorites] Recette invalide ignorée:", recipe);
        return false;
      }
      return true;
    });

    const serialized = JSON.stringify(validFavorites);
    
    // Vérifier la taille (localStorage a une limite d'environ 5-10MB)
    if (serialized.length > 5000000) {
      console.error("[Favorites] Taille des favoris trop importante, impossible de sauvegarder");
      return;
    }
    
    // Tester l'écriture dans localStorage
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, serialized);
    } catch (quotaError) {
      console.error("[Favorites] Erreur de quota localStorage:", quotaError);
      // Essayer de nettoyer un peu d'espace
      try {
        window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
        window.localStorage.setItem(FAVORITES_STORAGE_KEY, serialized);
      } catch (retryError) {
        console.error("[Favorites] Impossible de sauvegarder même après nettoyage:", retryError);
        return;
      }
    }
    
    // Vérifier que la sauvegarde a fonctionné
    const saved = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!saved) {
      console.error("[Favorites] ❌ La sauvegarde a échoué - aucune donnée trouvée après écriture");
      return;
    }
    
    if (saved !== serialized) {
      console.warn("[Favorites] ⚠️ Les données sauvegardées ne correspondent pas exactement (peut être normal)");
    }
    
    // Déclencher un événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new CustomEvent("favoritesUpdated", { 
      detail: { favorites: validFavorites } 
    }));
    
    // Log pour déboguer
    console.log(`[Favorites] ✅ Sauvegardé ${validFavorites.length} favoris avec succès`, validFavorites);
  } catch (error) {
    console.error("[Favorites] ❌ Erreur lors de la sauvegarde des favoris:", error);
    if (error instanceof Error) {
      console.error("[Favorites] Détails de l'erreur:", error.message, error.stack);
    }
    
    // Afficher plus d'informations sur l'erreur
    if (error instanceof DOMException) {
      if (error.code === 22 || error.code === 1014) {
        console.error("[Favorites] Quota localStorage dépassé - impossible de sauvegarder");
      }
    }
  }
}






