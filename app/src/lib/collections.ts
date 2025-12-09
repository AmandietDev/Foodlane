import type { Recipe } from "./recipes";
import { supabase } from "./supabaseClient";
import * as favoritesApi from "./favoritesApi";

export interface Collection {
  id: string;
  name: string;
  imageUrl?: string;
  recipeIds: string[];
  createdAt: number;
}

export const COLLECTIONS_STORAGE_KEY = "foodlane_collections";

/**
 * Charge les collections depuis Supabase pour l'utilisateur connecté
 * Utilise localStorage comme cache de secours si non connecté
 */
export async function loadCollections(): Promise<Collection[]> {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    // Vérifier si l'utilisateur est connecté
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      // Pas connecté : utiliser localStorage comme avant
      console.log("[Collections] Utilisateur non connecté, chargement depuis localStorage");
      return loadCollectionsFromLocalStorage();
    }

    // Utilisateur connecté : charger depuis Supabase via l'API
    try {
      const userCollections = await favoritesApi.getUserCollections();
      console.log(`[Collections] ✅ Chargé ${userCollections.length} collections depuis Supabase`);
      
      // Convertir le format de l'API vers le format Collection
      const collections: Collection[] = userCollections.map((uc) => ({
        id: uc.id,
        name: uc.name,
        imageUrl: undefined, // L'API ne retourne pas imageUrl pour l'instant
        recipeIds: uc.recipeIds,
        createdAt: uc.createdAt,
      }));
      
      // Mettre à jour le cache localStorage
      saveCollectionsToLocalStorage(collections);
      
      return collections;
    } catch (apiError) {
      console.error("[Collections] Erreur lors du chargement depuis l'API:", apiError);
      // Fallback sur localStorage en cas d'erreur
      return loadCollectionsFromLocalStorage();
    }
  } catch (error) {
    console.error("[Collections] ❌ Erreur lors du chargement:", error);
    return loadCollectionsFromLocalStorage();
  }
}

/**
 * Charge les collections depuis localStorage (fonction de secours)
 */
function loadCollectionsFromLocalStorage(): Collection[] {
  try {
    if (!window.localStorage) {
      return [];
    }

    const stored = window.localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored) as Collection[];
    return parsed;
  } catch (error) {
    console.error("[Collections] Erreur lors du chargement depuis localStorage:", error);
    return [];
  }
}

/**
 * Sauvegarde les collections dans localStorage (cache)
 */
function saveCollectionsToLocalStorage(collections: Collection[]): void {
  try {
    const serialized = JSON.stringify(collections);
    window.localStorage.setItem(COLLECTIONS_STORAGE_KEY, serialized);
  } catch (error) {
    console.error("[Collections] Erreur lors de la sauvegarde dans localStorage:", error);
  }
}

/**
 * Sauvegarde les collections dans Supabase pour l'utilisateur connecté
 * Met aussi à jour localStorage comme cache
 */
export async function saveCollections(collections: Collection[]): Promise<void> {
  if (typeof window === "undefined") {
    console.warn("[Collections] saveCollections appelé côté serveur, ignoré");
    return;
  }

  try {
    // Sauvegarder dans localStorage comme cache
    saveCollectionsToLocalStorage(collections);

    // Vérifier si l'utilisateur est connecté
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log("[Collections] Utilisateur non connecté, sauvegarde uniquement dans localStorage");
      // Déclencher l'événement même si pas connecté
      window.dispatchEvent(new CustomEvent("collectionsUpdated", { 
        detail: { collections } 
      }));
      return;
    }

    // Récupérer les collections actuelles depuis Supabase
    const { data: currentCollections } = await supabase
      .from("user_collections")
      .select("id")
      .eq("user_id", session.user.id);

    const currentIds = currentCollections?.map((c) => c.id) || [];
    const newIds = collections.map((c) => c.id);

    // Identifier les collections à ajouter, modifier et supprimer
    const toAdd = collections.filter((c) => !currentIds.includes(c.id));
    const toUpdate = collections.filter((c) => currentIds.includes(c.id));
    const toRemove = currentIds.filter((id) => !newIds.includes(id));

    // Ajouter les nouvelles collections
    if (toAdd.length > 0) {
      const collectionsToInsert = toAdd.map((collection) => {
        // Convertir createdAt en ISO string de manière sécurisée
        let created_at: string;
        if (collection.createdAt) {
          const date = new Date(collection.createdAt);
          // Vérifier que la date est valide
          if (isNaN(date.getTime())) {
            // Si la date est invalide, utiliser la date actuelle
            created_at = new Date().toISOString();
          } else {
            created_at = date.toISOString();
          }
        } else {
          // Si createdAt n'existe pas, utiliser la date actuelle
          created_at = new Date().toISOString();
        }
        
        return {
          id: collection.id,
          user_id: session.user.id,
          name: collection.name,
          image_url: collection.imageUrl || null,
          created_at,
        };
      });

      const { error: insertError } = await supabase
        .from("user_collections")
        .insert(collectionsToInsert);

      if (insertError) {
        console.error("[Collections] Erreur lors de l'ajout des collections:", insertError);
      } else {
        console.log(`[Collections] ✅ Ajouté ${toAdd.length} collections dans Supabase`);
        
        // Ajouter les recettes pour chaque nouvelle collection
        for (const collection of toAdd) {
          if (collection.recipeIds.length > 0) {
            await updateCollectionRecipes(collection.id, collection.recipeIds);
          }
        }
      }
    }

    // Mettre à jour les collections existantes
    for (const collection of toUpdate) {
      const { error: updateError } = await supabase
        .from("user_collections")
        .update({
          name: collection.name,
          image_url: collection.imageUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", collection.id)
        .eq("user_id", session.user.id);

      if (updateError) {
        console.error(`[Collections] Erreur lors de la mise à jour de la collection ${collection.id}:`, updateError);
      } else {
        // Mettre à jour les recettes de la collection
        await updateCollectionRecipes(collection.id, collection.recipeIds);
      }
    }

    // Supprimer les collections retirées
    if (toRemove.length > 0) {
      // Les recettes seront supprimées automatiquement grâce à ON DELETE CASCADE
      const { error: deleteError } = await supabase
        .from("user_collections")
        .delete()
        .eq("user_id", session.user.id)
        .in("id", toRemove);

      if (deleteError) {
        console.error("[Collections] Erreur lors de la suppression des collections:", deleteError);
      } else {
        console.log(`[Collections] ✅ Supprimé ${toRemove.length} collections de Supabase`);
      }
    }

    // Déclencher un événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new CustomEvent("collectionsUpdated", { 
      detail: { collections } 
    }));

    console.log(`[Collections] ✅ Synchronisé ${collections.length} collections avec Supabase`);
  } catch (error) {
    console.error("[Collections] ❌ Erreur lors de la sauvegarde des collections:", error);
    if (error instanceof Error) {
      console.error("[Collections] Détails de l'erreur:", error.message, error.stack);
    }
  }
}

/**
 * Met à jour les recettes d'une collection dans Supabase
 */
async function updateCollectionRecipes(collectionId: string, recipeIds: string[]): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Récupérer les recettes actuelles
    const { data: currentRecipes } = await supabase
      .from("user_collection_recipes")
      .select("recipe_id")
      .eq("collection_id", collectionId);

    const currentIds = currentRecipes?.map((r) => r.recipe_id) || [];

    // Identifier les recettes à ajouter et à supprimer
    const toAdd = recipeIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !recipeIds.includes(id));

    // Ajouter les nouvelles recettes
    if (toAdd.length > 0) {
      const recipesToInsert = toAdd.map((recipeId) => ({
        collection_id: collectionId,
        recipe_id: recipeId,
      }));

      const { error: insertError } = await supabase
        .from("user_collection_recipes")
        .insert(recipesToInsert);

      if (insertError) {
        console.error(`[Collections] Erreur lors de l'ajout des recettes à la collection ${collectionId}:`, insertError);
      }
    }

    // Supprimer les recettes retirées
    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from("user_collection_recipes")
        .delete()
        .eq("collection_id", collectionId)
        .in("recipe_id", toRemove);

      if (deleteError) {
        console.error(`[Collections] Erreur lors de la suppression des recettes de la collection ${collectionId}:`, deleteError);
      }
    }
  } catch (error) {
    console.error(`[Collections] Erreur lors de la mise à jour des recettes de la collection ${collectionId}:`, error);
  }
}

/**
 * Crée une nouvelle collection
 * Si l'utilisateur est connecté, utilise l'API Supabase
 * Sinon, crée une collection locale avec un ID temporaire
 */
export async function createCollection(name: string, imageUrl?: string): Promise<Collection> {
  if (typeof window === "undefined") {
    throw new Error("createCollection ne peut pas être appelé côté serveur");
  }

  // Vérifier si l'utilisateur est connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Utilisateur connecté : utiliser l'API Supabase
    try {
      const collectionId = await favoritesApi.createCollection(name);
      
      // Créer l'objet Collection avec l'ID retourné par Supabase
      const collection: Collection = {
        id: collectionId,
        name: name.trim(),
        imageUrl,
        recipeIds: [],
        createdAt: Date.now(),
      };
      
      // Mettre à jour le cache localStorage
      const collections = await loadCollections();
      saveCollectionsToLocalStorage([...collections, collection]);
      
      // Déclencher l'événement
      window.dispatchEvent(new CustomEvent("collectionsUpdated"));
      
      return collection;
    } catch (error) {
      console.error("[Collections] Erreur lors de la création de la collection:", error);
      throw error;
    }
  } else {
    // Non connecté : créer une collection locale
    const uuid = `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: uuid,
      name: name.trim(),
      imageUrl,
      recipeIds: [],
      createdAt: Date.now(),
    };
  }
}

/**
 * Ajoute une recette à une collection
 * Si l'utilisateur est connecté, utilise l'API Supabase directement
 * Sinon, utilise localStorage
 */
export async function addRecipeToCollection(
  collectionId: string,
  recipeId: string
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // Vérifier si l'utilisateur est connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Utilisateur connecté : utiliser l'API Supabase
    try {
      await favoritesApi.addRecipeToCollection(collectionId, recipeId);
      
      // Mettre à jour le cache localStorage
      const collections = await loadCollections();
      const collection = collections.find((c) => c.id === collectionId);
      if (collection && !collection.recipeIds.includes(recipeId)) {
        collection.recipeIds.push(recipeId);
        saveCollectionsToLocalStorage(collections);
      }
      
      // Déclencher l'événement
      window.dispatchEvent(new CustomEvent("collectionsUpdated"));
    } catch (error) {
      console.error("[Collections] Erreur lors de l'ajout de la recette à la collection:", error);
      throw error;
    }
  } else {
    // Non connecté : utiliser localStorage
    const collections = await loadCollections();
    const collection = collections.find((c) => c.id === collectionId);
    if (collection && !collection.recipeIds.includes(recipeId)) {
      collection.recipeIds.push(recipeId);
      await saveCollections(collections);
    }
  }
}

/**
 * Retire une recette d'une collection
 * Si l'utilisateur est connecté, utilise l'API Supabase directement
 * Sinon, utilise localStorage
 */
export async function removeRecipeFromCollection(
  collectionId: string,
  recipeId: string
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // Vérifier si l'utilisateur est connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Utilisateur connecté : utiliser l'API Supabase
    try {
      await favoritesApi.removeRecipeFromCollection(collectionId, recipeId);
      
      // Mettre à jour le cache localStorage
      const collections = await loadCollections();
      const collection = collections.find((c) => c.id === collectionId);
      if (collection) {
        collection.recipeIds = collection.recipeIds.filter((id) => id !== recipeId);
        saveCollectionsToLocalStorage(collections);
      }
      
      // Déclencher l'événement
      window.dispatchEvent(new CustomEvent("collectionsUpdated"));
    } catch (error) {
      console.error("[Collections] Erreur lors de la suppression de la recette de la collection:", error);
      throw error;
    }
  } else {
    // Non connecté : utiliser localStorage
    const collections = await loadCollections();
    const collection = collections.find((c) => c.id === collectionId);
    if (collection) {
      collection.recipeIds = collection.recipeIds.filter((id) => id !== recipeId);
      await saveCollections(collections);
    }
  }
}

/**
 * Supprime une collection
 * Si l'utilisateur est connecté, utilise l'API Supabase directement
 * Sinon, utilise localStorage
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // Vérifier si l'utilisateur est connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Utilisateur connecté : utiliser l'API Supabase
    try {
      await favoritesApi.deleteCollection(collectionId);
      
      // Mettre à jour le cache localStorage
      const collections = await loadCollections();
      const filtered = collections.filter((c) => c.id !== collectionId);
      saveCollectionsToLocalStorage(filtered);
      
      // Déclencher l'événement
      window.dispatchEvent(new CustomEvent("collectionsUpdated"));
    } catch (error) {
      console.error("[Collections] Erreur lors de la suppression de la collection:", error);
      throw error;
    }
  } else {
    // Non connecté : utiliser localStorage
    const collections = await loadCollections();
    const filtered = collections.filter((c) => c.id !== collectionId);
    await saveCollections(filtered);
  }
}

/**
 * Met à jour une collection (nom, imageUrl)
 * Si l'utilisateur est connecté, utilise l'API Supabase directement
 * Sinon, utilise localStorage
 */
export async function updateCollection(
  collectionId: string,
  updates: Partial<Pick<Collection, "name" | "imageUrl">>
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // Vérifier si l'utilisateur est connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Utilisateur connecté : utiliser l'API Supabase
    try {
      if (updates.name) {
        await favoritesApi.updateCollection(collectionId, updates.name);
      }
      
      // Mettre à jour le cache localStorage
      const collections = await loadCollections();
      const collection = collections.find((c) => c.id === collectionId);
      if (collection) {
        Object.assign(collection, updates);
        saveCollectionsToLocalStorage(collections);
      }
      
      // Déclencher l'événement
      window.dispatchEvent(new CustomEvent("collectionsUpdated"));
    } catch (error) {
      console.error("[Collections] Erreur lors de la mise à jour de la collection:", error);
      throw error;
    }
  } else {
    // Non connecté : utiliser localStorage
    const collections = await loadCollections();
    const collection = collections.find((c) => c.id === collectionId);
    if (collection) {
      Object.assign(collection, updates);
      await saveCollections(collections);
    }
  }
}

