import type { Recipe } from "./recipes";

export interface Collection {
  id: string;
  name: string;
  imageUrl?: string;
  recipeIds: string[];
  createdAt: number;
}

export const COLLECTIONS_STORAGE_KEY = "foodlane_collections";

export function loadCollections(): Collection[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    if (!window.localStorage) {
      console.error("[Collections] localStorage n'est pas disponible");
      return [];
    }

    const stored = window.localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (!stored) {
      console.log("[Collections] Aucune collection trouvée dans localStorage");
      return [];
    }
    
    const parsed = JSON.parse(stored) as Collection[];
    console.log(`[Collections] ✅ Chargé ${parsed.length} collections depuis localStorage`);
    return parsed;
  } catch (error) {
    console.error("[Collections] ❌ Erreur lors du chargement des collections :", error);
    if (error instanceof Error) {
      console.error("[Collections] Détails:", error.message);
    }
    return [];
  }
}

export function saveCollections(collections: Collection[]): void {
  if (typeof window === "undefined") {
    console.warn("[Collections] saveCollections appelé côté serveur, ignoré");
    return;
  }

  try {
    // Vérifier que localStorage est disponible
    if (!window.localStorage) {
      console.error("[Collections] localStorage n'est pas disponible");
      return;
    }

    const serialized = JSON.stringify(collections);
    
    // Vérifier la taille (localStorage a une limite d'environ 5-10MB)
    if (serialized.length > 5000000) {
      console.error("[Collections] Taille des collections trop importante, impossible de sauvegarder");
      return;
    }
    
    // Sauvegarder dans localStorage
    try {
      window.localStorage.setItem(COLLECTIONS_STORAGE_KEY, serialized);
    } catch (quotaError) {
      console.error("[Collections] Erreur de quota localStorage:", quotaError);
      // Essayer de nettoyer un peu d'espace
      try {
        window.localStorage.removeItem(COLLECTIONS_STORAGE_KEY);
        window.localStorage.setItem(COLLECTIONS_STORAGE_KEY, serialized);
      } catch (retryError) {
        console.error("[Collections] Impossible de sauvegarder même après nettoyage:", retryError);
        return;
      }
    }
    
    // Vérifier que la sauvegarde a fonctionné
    const saved = window.localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (!saved) {
      console.error("[Collections] ❌ La sauvegarde a échoué - aucune donnée trouvée après écriture");
      return;
    }
    
    // Vérifier que les données sauvegardées correspondent
    try {
      const savedParsed = JSON.parse(saved);
      if (savedParsed.length !== collections.length) {
        console.error("[Collections] ❌ Incohérence: nombre de collections différent après sauvegarde");
        console.error("[Collections] Attendu:", collections.length, "Obtenu:", savedParsed.length);
      }
    } catch (parseError) {
      console.error("[Collections] ❌ Erreur lors de la vérification des données sauvegardées:", parseError);
    }
    
    // Déclencher un événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new CustomEvent("collectionsUpdated", { 
      detail: { collections } 
    }));
    
    console.log(`[Collections] ✅ Sauvegardé ${collections.length} collections avec succès`, collections.map(c => ({ id: c.id, name: c.name, recipes: c.recipeIds.length })));
  } catch (error) {
    console.error("[Collections] ❌ Erreur lors de la sauvegarde des collections:", error);
    if (error instanceof Error) {
      console.error("[Collections] Détails de l'erreur:", error.message, error.stack);
    }
    
    // Afficher plus d'informations sur l'erreur
    if (error instanceof DOMException) {
      if (error.code === 22 || error.code === 1014) {
        console.error("[Collections] Quota localStorage dépassé - impossible de sauvegarder");
      }
    }
  }
}

export function createCollection(name: string, imageUrl?: string): Collection {
  return {
    id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    imageUrl,
    recipeIds: [],
    createdAt: Date.now(),
  };
}

export function addRecipeToCollection(
  collectionId: string,
  recipeId: string
): void {
  const collections = loadCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (collection && !collection.recipeIds.includes(recipeId)) {
    collection.recipeIds.push(recipeId);
    saveCollections(collections);
  }
}

export function removeRecipeFromCollection(
  collectionId: string,
  recipeId: string
): void {
  const collections = loadCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (collection) {
    collection.recipeIds = collection.recipeIds.filter((id) => id !== recipeId);
    saveCollections(collections);
  }
}

export function deleteCollection(collectionId: string): void {
  const collections = loadCollections();
  const filtered = collections.filter((c) => c.id !== collectionId);
  saveCollections(filtered);
}

export function updateCollection(
  collectionId: string,
  updates: Partial<Pick<Collection, "name" | "imageUrl">>
): void {
  const collections = loadCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (collection) {
    Object.assign(collection, updates);
    saveCollections(collections);
  }
}

