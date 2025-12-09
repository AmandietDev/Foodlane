"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "../src/lib/supabaseClient";
import type { Recipe } from "../src/lib/recipes";
import { loadFavorites, saveFavorites } from "../src/lib/favorites";
import RecipeImage from "../components/RecipeImage";
import { detectDietaryBadges, DIETARY_BADGE_ICONS } from "../src/lib/dietaryProfiles";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import {
  type Collection,
  loadCollections,
  saveCollections,
  createCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
  deleteCollection,
  updateCollection,
} from "../src/lib/collections";
import { getCurrentWeekMenu, formatDateDisplay } from "../src/lib/weeklyMenu";
import {
  generateSmartShoppingList,
  formatShoppingListItem,
  type ShoppingListItem,
} from "../src/lib/shoppingList";

export default function FavorisPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [recipeToAdd, setRecipeToAdd] = useState<Recipe | null>(null);
  const [newlyCreatedCollection, setNewlyCreatedCollection] = useState<Collection | null>(null);
  const [showAddRecipesToNewCollection, setShowAddRecipesToNewCollection] = useState(false);
  const [showAddRecipesToCollection, setShowAddRecipesToCollection] = useState(false);
  const [collectionToAddRecipes, setCollectionToAddRecipes] = useState<Collection | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [hasMenu, setHasMenu] = useState(false);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Vérifier la session et protéger la page
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Erreur lors de la vérification de la session:", error);
        router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth) return; // Attendre la vérification d'authentification
    
    // Charger les favoris et collections au montage
    const loadData = async () => {
      const loadedFavorites = await loadFavorites();
      const loadedCollections = await loadCollections();
      
      // Données chargées avec succès
      
      // Toujours mettre à jour les favoris et collections depuis localStorage
      setFavorites(loadedFavorites);
      setCollections(loadedCollections);
      
      // Mettre à jour la collection sélectionnée si nécessaire
      if (selectedCollection) {
        const updatedCollection = loadedCollections.find(c => c.id === selectedCollection.id);
        if (!updatedCollection) {
          setSelectedCollection(null);
        }
      }
    };
    
    // Charger immédiatement
    loadData();

    // Écouter les changements de localStorage (depuis d'autres onglets)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "foodlane_favorites" || e.key === "foodlane_collections") {
        // Événement storage détecté, rechargement...
        loadData();
      }
    };

    // Écouter l'événement personnalisé de mise à jour des favoris
    const handleFavoritesUpdated = () => {
      // Événement favoritesUpdated détecté, rechargement...
      loadData();
    };

    // Écouter l'événement personnalisé de mise à jour des collections
    const handleCollectionsUpdated = () => {
      // Événement collectionsUpdated détecté, rechargement...
      loadData();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("favoritesUpdated", handleFavoritesUpdated);
    window.addEventListener("collectionsUpdated", handleCollectionsUpdated);
    
    // Vérifier périodiquement les changements (pour la même page) - toutes les 2 secondes
    const interval = setInterval(async () => {
      const currentFavorites = await loadFavorites();
      const currentCollections = await loadCollections();
      const currentFavoriteIds = currentFavorites.map(f => f.id).sort().join(',');
      const currentCollectionIds = currentCollections.map(c => c.id).sort().join(',');
      
      // Comparer avec l'état actuel sans créer de dépendance
      setFavorites(prevFavorites => {
        const prevIds = prevFavorites.map(f => f.id).sort().join(',');
        if (currentFavoriteIds !== prevIds) {
          // Détection de changement dans localStorage (favoris), rechargement...
          return currentFavorites;
        }
        return prevFavorites;
      });
      
      setCollections(prevCollections => {
        const prevIds = prevCollections.map(c => c.id).sort().join(',');
        if (currentCollectionIds !== prevIds || currentCollections.length !== prevCollections.length) {
          // Détection de changement dans localStorage (collections), rechargement...
          return currentCollections;
        }
        return prevCollections;
      });
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdated);
      window.removeEventListener("collectionsUpdated", handleCollectionsUpdated);
      clearInterval(interval);
    };
  }, [selectedCollection?.id]); // Recharger seulement si la collection sélectionnée change

  // Recharger les favoris et collections quand on revient sur cette page
  useEffect(() => {
    if (pathname === "/favoris" || pathname === "/ressources") {
      const reloadData = async () => {
        const loadedFavorites = await loadFavorites();
        const loadedCollections = await loadCollections();
        // Rechargement depuis pathname
        setFavorites(loadedFavorites);
        setCollections(loadedCollections);
      
      // Vérifier aussi dans localStorage directement
      if (typeof window !== "undefined") {
        const rawFavorites = window.localStorage.getItem("foodlane_favorites");
        const rawCollections = window.localStorage.getItem("foodlane_collections");
        // Données chargées depuis localStorage
      }
      };
      reloadData();
    }
  }, [pathname]);

  // Ne pas sauvegarder automatiquement ici - la sauvegarde se fait uniquement dans toggleFavorite
  // Cela évite les conflits et les boucles infinies

  // Charger le menu et générer la liste de courses
  useEffect(() => {
    const loadMenuAndShoppingList = () => {
      const currentMenu = getCurrentWeekMenu();
      if (currentMenu) {
        setHasMenu(true);
        // Générer la liste de courses à partir du menu
        const list = generateSmartShoppingList(currentMenu, favorites);
        setShoppingList(list);
      } else {
        setHasMenu(false);
        setShoppingList([]);
      }
    };
    
    // Charger au montage et quand les favoris changent (pour recalculer la liste)
    loadMenuAndShoppingList();
  }, [favorites]);

  // Ne PAS sauvegarder automatiquement dans useEffect
  // La sauvegarde se fait directement dans les fonctions qui modifient les collections
  // Cela évite les conflits et les boucles infinies

  function isFavorite(recipeId: string): boolean {
    return favorites.some((fav) => fav.id === recipeId);
  }

  async function toggleFavorite(recipe: Recipe) {
    const updated = favorites.some((fav) => fav.id === recipe.id)
      ? favorites.filter((fav) => fav.id !== recipe.id)
      : [...favorites, recipe];
    
    setFavorites(updated);
    await saveFavorites(updated);
  }

  async function handleCreateCollection() {
    if (!newCollectionName.trim()) {
      return; // Ne rien faire si le nom est vide
    }

    try {
      // Création de la collection
      const newCollection = await createCollection(newCollectionName.trim());
      // Collection créée avec succès
      
      // Recharger pour avoir les données à jour depuis Supabase
      const saved = await loadCollections();
      // Collections rechargées
      
      // Mettre à jour l'état React avec les données sauvegardées
      setCollections(saved);
      const savedCollection = saved.find(c => c.id === newCollection.id) || newCollection;
      setNewlyCreatedCollection(savedCollection);
      // Collection créée avec succès
      
      setNewCollectionName("");
      setShowCreateCollection(false);
      
      // Ouvrir immédiatement le modal pour ajouter des recettes à cette nouvelle collection
      setShowAddRecipesToNewCollection(true);
    } catch (error) {
      console.error("[FavorisPage] ❌ Erreur lors de la création de la collection:", error);
      alert(`Erreur lors de la création de la collection: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
    }
  }

  async function handleAddToCollection(collectionId: string) {
    if (recipeToAdd) {
      await addRecipeToCollection(collectionId, recipeToAdd.id);
      const updated = await loadCollections();
      setCollections(updated);
      setShowAddToCollection(false);
      setRecipeToAdd(null);
    }
  }

  async function handleRemoveFromCollection(collectionId: string, recipeId: string) {
    await removeRecipeFromCollection(collectionId, recipeId);
    const updated = await loadCollections();
    setCollections(updated);
    if (selectedCollection) {
      setSelectedCollection(updated.find((c) => c.id === selectedCollection.id) || null);
    }
  }

  function getCollectionRecipes(collection: Collection): Recipe[] {
    return favorites.filter((recipe) => collection.recipeIds.includes(recipe.id));
  }

  function getCollectionImage(collection: Collection): string | undefined {
    const recipes = getCollectionRecipes(collection);
    return recipes.find((r) => r.image_url)?.image_url;
  }

  const displayRecipes = selectedCollection
    ? getCollectionRecipes(selectedCollection)
    : favorites;

  // Afficher un écran de chargement pendant la vérification d'authentification
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Vérification de la connexion..." />
      </div>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* En-tête avec recherche - style inspiré de l'image */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#D44A4A]">MON CARNET</h1>
        </div>
        
      </header>

      {/* Widget Menu et Liste de courses */}
      {!selectedCollection && (
        <section className="mb-6">
          <div className="bg-[var(--beige-card)] border border-[var(--beige-border)] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#6B2E2E]">Menu de la semaine</h2>
              <Link
                href="/menu-semaine"
                className="text-sm text-[#D44A4A] font-semibold hover:text-[#C03A3A]"
              >
                Voir le menu →
              </Link>
            </div>

            {!hasMenu ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-sm text-[#7A3A3A] mb-4">
                  Crée ton menu de la semaine
                </p>
                <Link
                  href="/menu-semaine"
                  className="inline-block px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A] transition-colors"
                >
                  Créer un menu
                </Link>
              </div>
            ) : (
              <>
                {/* Récapitulatif du menu */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-[#6B2E2E] mb-3">
                    Récapitulatif
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const currentMenu = getCurrentWeekMenu();
                      if (!currentMenu) return null;
                      
                      return currentMenu.days.map((day) => {
                        // Compter le nombre total de recettes pour ce jour
                        const recipeCount = Object.values(day.meals).reduce((total, meal) => {
                          if (meal && meal.recipes) {
                            return total + meal.recipes.length;
                          }
                          return total;
                        }, 0);
                        
                        // En mode vue, ne montrer que les jours qui ont au moins un repas
                        if (recipeCount === 0) return null;
                        
                        return (
                          <div
                            key={day.date}
                            className="flex items-center justify-between p-2 bg-white rounded-lg border border-[var(--beige-border)]"
                          >
                            <span className="text-sm text-[#6B2E2E] font-medium">
                              {formatDateDisplay(day.date)}
                            </span>
                            <span className="text-xs bg-[#D44A4A] text-white px-2 py-1 rounded-full font-semibold">
                              {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
                            </span>
                          </div>
                        );
                      }).filter(Boolean);
                    })()}
                    {(() => {
                      const currentMenu = getCurrentWeekMenu();
                      if (!currentMenu) return null;
                      
                      const totalDaysWithRecipes = currentMenu.days.filter((day) => {
                        const recipeCount = Object.values(day.meals).reduce((total, meal) => {
                          if (meal && meal.recipes) {
                            return total + meal.recipes.length;
                          }
                          return total;
                        }, 0);
                        return recipeCount > 0;
                      }).length;
                      
                      if (totalDaysWithRecipes === 0) {
                        return (
                          <p className="text-sm text-[#7A3A3A] italic text-center py-4">
                            Aucune recette dans le menu pour le moment
                          </p>
                        );
                      }
                      
                      return null;
                    })()}
                  </div>
                </div>
                
                <div className="space-y-2 pt-3 border-t border-[var(--beige-border)]">
                  <Link
                    href="/menu-semaine"
                    className="block text-center px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A] transition-colors"
                  >
                    Voir le menu complet
                  </Link>
                  <button
                    onClick={() => {
                      // Naviguer vers la page menu-semaine et ouvrir la liste de courses
                      const currentMenu = getCurrentWeekMenu();
                      if (currentMenu) {
                        // Stocker un flag pour ouvrir automatiquement la liste de courses
                        localStorage.setItem("foodlane_show_shopping_list", "true");
                      }
                      window.location.href = "/menu-semaine";
                    }}
                    className="w-full text-center px-4 py-2 rounded-xl bg-white border-2 border-[#D44A4A] text-[#D44A4A] text-sm font-semibold hover:bg-[#FFD9D9] transition-colors"
                  >
                    Accéder à ma liste de courses
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Section Collections - style inspiré de l'image */}
      {!selectedCollection && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#6B2E2E]">Mes catégories</h2>
            <button
              onClick={() => setShowCreateCollection(true)}
              className="text-sm text-[#D44A4A] font-semibold hover:text-[#C03A3A]"
            >
              + Créer
            </button>
          </div>
          
          {collections.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-[var(--beige-border)]">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-sm text-[#7A3A3A] mb-4">
                Crée ta première collection pour organiser tes recettes
              </p>
              <button
                onClick={() => setShowCreateCollection(true)}
                className="px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A]"
              >
                Créer une collection
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {(showAllCollections ? collections : collections.slice(0, 2)).map((collection) => {
                const collectionRecipes = getCollectionRecipes(collection);
                const collectionImage = getCollectionImage(collection);
                
                return (
                  <article
                    key={collection.id}
                    className="relative rounded-2xl overflow-hidden bg-white shadow-md cursor-pointer hover:shadow-lg transition-shadow group"
                    onClick={() => setSelectedCollection(collection)}
                  >
                    <div className="relative w-full h-32">
                      {collectionImage ? (
                        <RecipeImage
                          imageUrl={collectionImage}
                          alt={collection.name}
                          className="w-full h-full"
                          priority={false}
                          sizes="(max-width: 768px) 50vw, 25vw"
                          fallbackClassName=""
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] flex items-center justify-center">
                          <span className="text-4xl">📁</span>
                        </div>
                      )}
                      {/* Bouton de suppression en overlay */}
                      <button
                        className="absolute top-2 right-2 p-2 rounded-full bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Supprimer la collection "${collection.name}" ?`)) {
                            await deleteCollection(collection.id);
                            const updated = await loadCollections();
                            setCollections(updated);
                            // Collection supprimée
                          }
                        }}
                        aria-label="Supprimer la collection"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#D44A4A"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-base text-[#6B2E2E] mb-1">
                        {collection.name}
                      </h3>
                      <p className="text-sm text-[#7A3A3A]">
                        {collectionRecipes.length} {collectionRecipes.length === 1 ? "recette" : "recettes"}
                      </p>
                    </div>
                  </article>
                );
              })}
              </div>
              {!showAllCollections && collections.length > 2 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllCollections(true)}
                    className="px-6 py-3 rounded-xl bg-white border-2 border-[#D44A4A] text-[#D44A4A] text-sm font-semibold hover:bg-[#FFD9D9] transition-colors"
                  >
                    Voir tout ({collections.length} collections)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Section Toutes les recettes sauvegardées */}
      {!selectedCollection && favorites.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#6B2E2E]">
              Toutes mes recettes ({favorites.length})
            </h2>
            {!showAllFavorites && favorites.length > 4 && (
              <button
                onClick={() => setShowAllFavorites(true)}
                className="text-sm text-[#D44A4A] font-semibold hover:text-[#C03A3A]"
              >
                Voir tout →
              </button>
            )}
          </div>
        </section>
      )}

      {/* En-tête de collection sélectionnée */}
      {selectedCollection && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#6B2E2E]">
                {selectedCollection.name}
              </h2>
              <p className="text-sm text-[#7A3A3A]">
                {getCollectionRecipes(selectedCollection).length} {getCollectionRecipes(selectedCollection).length === 1 ? "recette" : "recettes"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCollectionToAddRecipes(selectedCollection);
                  setShowAddRecipesToCollection(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#D44A4A] text-white text-xs font-semibold hover:bg-[#C03A3A] transition-colors"
              >
                + Ajouter des recettes
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Supprimer la collection "${selectedCollection.name}" ?`)) {
                    await deleteCollection(selectedCollection.id);
                    const updated = await loadCollections();
                    setCollections(updated);
                    setSelectedCollection(null);
                    console.log("[FavorisPage] Collection supprimée, collections restantes:", updated.length);
                  }
                }}
                className="text-sm text-red-500 font-semibold hover:text-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Grille de recettes */}
      {displayRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-[#6B2E2E] mb-2">
            {selectedCollection
              ? "Aucune recette dans cette collection"
              : "Aucune recette sauvegardée"}
          </h3>
          <p className="text-sm text-[#7A3A3A] mb-4">
            {selectedCollection
              ? "Ajoute des recettes à cette collection depuis les favoris"
              : "Ajoute des recettes à tes favoris pour les retrouver ici"}
          </p>
          {!selectedCollection && (
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A]"
            >
              Découvrir des recettes
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {(showAllFavorites || selectedCollection ? displayRecipes : displayRecipes.slice(0, 4)).map((recipe) => (
            <article
              key={recipe.id}
              className="cursor-pointer group"
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2 bg-gray-100 shadow-md group-hover:shadow-lg transition-shadow">
                {recipe.image_url ? (
                  <RecipeImage
                    imageUrl={recipe.image_url}
                    alt={recipe.nom}
                    className="w-full h-full"
                    priority={false}
                    sizes="(max-width: 768px) 50vw, 33vw"
                    fallbackClassName="rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] flex items-center justify-center rounded-2xl">
                    <span className="text-4xl">🍽️</span>
                  </div>
                )}
                {/* Badge favori en overlay */}
                <button
                  className="absolute top-2 right-2 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFavorite(recipe);
                  }}
                  aria-label="Retirer des favoris"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={isFavorite(recipe.id) ? "#D44A4A" : "none"}
                    stroke={isFavorite(recipe.id) ? "#D44A4A" : "#6B2E2E"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
                {/* Badges diététiques en overlay en bas */}
                {detectDietaryBadges(recipe).length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                    {detectDietaryBadges(recipe).slice(0, 2).map((badge) => (
                      <span
                        key={badge}
                        className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold bg-[#D44A4A]/95 text-white backdrop-blur-sm border border-white/30 flex items-center gap-0.5"
                        title={badge}
                      >
                        <span className="text-[7px]">{DIETARY_BADGE_ICONS[badge]}</span>
                        <span>{badge}</span>
                      </span>
                    ))}
                    {detectDietaryBadges(recipe).length > 2 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold bg-[#D44A4A]/95 text-white backdrop-blur-sm border border-white/30">
                        +{detectDietaryBadges(recipe).length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <h4 className="font-semibold text-sm text-[#6B2E2E] text-center leading-tight px-1 line-clamp-2">
                {recipe.nom}
              </h4>
            </article>
          ))}
        </div>
        {!selectedCollection && !showAllFavorites && favorites.length > 4 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAllFavorites(true)}
              className="px-6 py-3 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A] transition-colors"
            >
              Voir tout ({favorites.length} recettes)
            </button>
          </div>
        )}
        </>
      )}

      {/* Modal de création de collection */}
      {showCreateCollection && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFF0F0] rounded-2xl p-6 shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-[#6B2E2E] mb-4">Créer une collection</h3>
            <input
              type="text"
              placeholder="Nom de la collection"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full rounded-xl bg-white border border-[var(--beige-border)] px-4 py-3 text-sm outline-none focus:border-[#D44A4A] text-[#6B2E2E] mb-4"
              onKeyPress={async (e) => {
                if (e.key === "Enter") {
                  await handleCreateCollection();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--beige-card-alt)] border border-[var(--beige-border)] text-sm text-[var(--text-primary)] font-semibold hover:border-[var(--beige-accent)] transition-colors"
                onClick={() => {
                  setShowCreateCollection(false);
                  setNewCollectionName("");
                }}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] text-sm font-semibold text-white hover:from-[#C03A3A] hover:to-[#D44A4A] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={async () => {
                  await handleCreateCollection();
                }}
                disabled={!newCollectionName.trim()}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout de recettes à une collection nouvellement créée */}
      {showAddRecipesToNewCollection && newlyCreatedCollection && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFF0F0] rounded-2xl p-6 shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#6B2E2E]">
                Ajouter des recettes à "{newlyCreatedCollection.name}"
              </h3>
              <button
                onClick={() => {
                  setShowAddRecipesToNewCollection(false);
                  setNewlyCreatedCollection(null);
                }}
                className="text-[var(--text-muted)] hover:text-[#6B2E2E]"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-[#7A3A3A] mb-4">
              Sélectionne les recettes que tu veux ajouter à cette collection
            </p>
            
            {favorites.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-sm text-[#7A3A3A] mb-4">
                  Tu n'as pas encore de recettes sauvegardées.
                </p>
                <button
                  onClick={() => {
                    setShowAddRecipesToNewCollection(false);
                    setNewlyCreatedCollection(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A]"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                  {favorites.map((recipe) => {
                    const isInCollection = newlyCreatedCollection.recipeIds.includes(recipe.id);
                    return (
                      <button
                        key={recipe.id}
                        className={`w-full text-left rounded-xl border transition-colors overflow-hidden ${
                          isInCollection
                            ? "bg-[#FFD9D9] border-[#D44A4A]"
                            : "bg-white border-[var(--beige-border)] hover:border-[#D44A4A]"
                        }`}
                        onClick={async () => {
                          if (isInCollection) {
                            await removeRecipeFromCollection(newlyCreatedCollection.id, recipe.id);
                          } else {
                            await addRecipeToCollection(newlyCreatedCollection.id, recipe.id);
                          }
                          // Recharger les collections depuis Supabase/localStorage
                          const updated = await loadCollections();
                          setCollections(updated);
                          // Mettre à jour la collection nouvellement créée
                          const updatedCollection = updated.find(c => c.id === newlyCreatedCollection.id);
                          if (updatedCollection) {
                            setNewlyCreatedCollection(updatedCollection);
                          }
                          // Collections mises à jour
                        }}
                      >
                        <div className="flex items-center gap-3 p-3">
                          {/* Image de la recette */}
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            {recipe.image_url ? (
                              <RecipeImage
                                imageUrl={recipe.image_url}
                                alt={recipe.nom}
                                className="w-full h-full"
                                fallbackClassName="rounded-lg"
                                priority={false}
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] flex items-center justify-center">
                                <span className="text-2xl">🍽️</span>
                              </div>
                            )}
                          </div>
                          {/* Nom de la recette */}
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-[#6B2E2E] block truncate">{recipe.nom}</span>
                          </div>
                          {/* Indicateur de sélection */}
                          {isInCollection && (
                            <div className="flex-shrink-0">
                              <span className="text-[#D44A4A] text-xl">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-4 border-t border-[var(--beige-border)]">
                  <button
                    className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] text-sm font-semibold text-white hover:from-[#C03A3A] hover:to-[#D44A4A] transition-all shadow-md"
                    onClick={() => {
                      setShowAddRecipesToNewCollection(false);
                      setNewlyCreatedCollection(null);
                    }}
                  >
                    Terminer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal d'ajout de recettes à une collection existante */}
      {showAddRecipesToCollection && collectionToAddRecipes && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFF0F0] rounded-2xl p-6 shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#6B2E2E]">
                Ajouter des recettes à "{collectionToAddRecipes.name}"
              </h3>
              <button
                onClick={() => {
                  setShowAddRecipesToCollection(false);
                  setCollectionToAddRecipes(null);
                }}
                className="text-[var(--text-muted)] hover:text-[#6B2E2E]"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-[#7A3A3A] mb-4">
              Sélectionne les recettes que tu veux ajouter à cette collection
            </p>
            
            {favorites.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-sm text-[#7A3A3A] mb-4">
                  Tu n'as pas encore de recettes sauvegardées.
                </p>
                <button
                  onClick={() => {
                    setShowAddRecipesToCollection(false);
                    setCollectionToAddRecipes(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A]"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                  {favorites.map((recipe) => {
                    const isInCollection = collectionToAddRecipes.recipeIds.includes(recipe.id);
                    return (
                      <button
                        key={recipe.id}
                        className={`w-full text-left rounded-xl border transition-colors overflow-hidden ${
                          isInCollection
                            ? "bg-[#FFD9D9] border-[#D44A4A]"
                            : "bg-white border-[var(--beige-border)] hover:border-[#D44A4A]"
                        }`}
                        onClick={async () => {
                          if (isInCollection) {
                            await removeRecipeFromCollection(collectionToAddRecipes.id, recipe.id);
                          } else {
                            await addRecipeToCollection(collectionToAddRecipes.id, recipe.id);
                          }
                          // Recharger les collections depuis Supabase/localStorage
                          const updated = await loadCollections();
                          setCollections(updated);
                          // Mettre à jour la collection
                          const updatedCollection = updated.find(c => c.id === collectionToAddRecipes.id);
                          if (updatedCollection) {
                            setCollectionToAddRecipes(updatedCollection);
                            // Mettre à jour la collection sélectionnée aussi
                            if (selectedCollection && selectedCollection.id === collectionToAddRecipes.id) {
                              setSelectedCollection(updatedCollection);
                            }
                          }
                          // Collections mises à jour
                        }}
                      >
                        <div className="flex items-center gap-3 p-3">
                          {/* Image de la recette */}
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            {recipe.image_url ? (
                              <RecipeImage
                                imageUrl={recipe.image_url}
                                alt={recipe.nom}
                                className="w-full h-full"
                                fallbackClassName="rounded-lg"
                                priority={false}
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] flex items-center justify-center">
                                <span className="text-2xl">🍽️</span>
                              </div>
                            )}
                          </div>
                          {/* Nom de la recette */}
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-[#6B2E2E] block truncate">{recipe.nom}</span>
                          </div>
                          {/* Indicateur de sélection */}
                          {isInCollection && (
                            <div className="flex-shrink-0">
                              <span className="text-[#D44A4A] text-xl">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-4 border-t border-[var(--beige-border)]">
                  <button
                    className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] text-sm font-semibold text-white hover:from-[#C03A3A] hover:to-[#D44A4A] transition-all shadow-md"
                    onClick={async () => {
                      setShowAddRecipesToCollection(false);
                      setCollectionToAddRecipes(null);
                      // Recharger la collection sélectionnée
                      if (selectedCollection) {
                        const updated = await loadCollections();
                        const updatedCollection = updated.find(c => c.id === selectedCollection.id);
                        if (updatedCollection) {
                          setSelectedCollection(updatedCollection);
                        }
                      }
                    }}
                  >
                    Terminer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal d'ajout à une collection */}
      {showAddToCollection && recipeToAdd && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFF0F0] rounded-2xl p-6 shadow-xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#6B2E2E] mb-4">
              Ajouter à une collection
            </h3>
            <p className="text-sm text-[#7A3A3A] mb-4">{recipeToAdd.nom}</p>
            <div className="space-y-2 mb-4">
              {collections.map((collection) => {
                const isInCollection = collection.recipeIds.includes(recipeToAdd.id);
                return (
                  <button
                    key={collection.id}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      isInCollection
                        ? "bg-[#FFD9D9] border-[#D44A4A]"
                        : "bg-white border-[var(--beige-border)] hover:border-[#D44A4A]"
                    }`}
                    onClick={() => {
                      if (isInCollection) {
                        handleRemoveFromCollection(collection.id, recipeToAdd.id);
                      } else {
                        handleAddToCollection(collection.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#6B2E2E]">{collection.name}</span>
                      {isInCollection && (
                        <span className="text-[#D44A4A]">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {collections.length === 0 && (
              <p className="text-sm text-[#7A3A3A] text-center mb-4">
                Aucune collection. Crée-en une d'abord !
              </p>
            )}
            <button
              className="w-full px-4 py-2 rounded-xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] text-sm font-semibold text-white hover:from-[#C03A3A] hover:to-[#D44A4A] transition-all shadow-md"
              onClick={() => {
                setShowAddToCollection(false);
                setRecipeToAdd(null);
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal de détail de recette */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center">
          <div className="w-full h-full max-w-md bg-[#FFF0F0] border-l border-r border-[#E8A0A0] overflow-y-auto px-4 pt-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#6B2E2E]">
                {selectedRecipe.nom}
              </h3>
              <button
                className="text-xs text-[#7A3A3A] hover:text-[#6B2E2E]"
                onClick={() => setSelectedRecipe(null)}
              >
                Fermer ✕
              </button>
            </div>

            {/* Vue détaillée */}
            <div className="text-xs">
              <div className="relative -mx-4 -mt-4 mb-4">
                {selectedRecipe.image_url ? (
                  <div className="relative w-full h-64">
                    <RecipeImage
                      imageUrl={selectedRecipe.image_url}
                      alt={selectedRecipe.nom}
                      className="w-full h-full"
                      priority={true}
                      sizes="100vw"
                      fallbackClassName=""
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        className="p-2.5 rounded-full bg-white/90 backdrop-blur-md hover:bg-white transition-all"
                        onClick={() => {
                          toggleFavorite(selectedRecipe);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill={isFavorite(selectedRecipe.id) ? "#D44A4A" : "none"}
                          stroke={isFavorite(selectedRecipe.id) ? "#D44A4A" : "#6B2E2E"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-6 h-6"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] flex items-center justify-center">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}
              </div>

              {selectedRecipe.type && (
                <div className="mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    selectedRecipe.type.toLowerCase().includes("sucré")
                      ? "text-[#D44A4A]"
                      : "text-[#C03A3A]"
                  }`}>
                    {selectedRecipe.type.toUpperCase()}
                  </span>
                </div>
              )}

              <h2 className="text-2xl font-bold text-[#6B2E2E] mb-3 leading-tight">
                {selectedRecipe.nom}
              </h2>

              <div className="grid grid-cols-4 gap-3 mb-4 pb-4 border-b border-[#E8A0A0]">
                {selectedRecipe.temps_preparation_min > 0 && (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] flex items-center justify-center mx-auto mb-2 shadow-md">
                      <span className="text-white text-lg">⏱</span>
                    </div>
                    <p className="text-[10px] text-[#7A3A3A] font-semibold">{selectedRecipe.temps_preparation_min} min</p>
                  </div>
                )}
                {selectedRecipe.nb_personnes > 0 && (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] flex items-center justify-center mx-auto mb-2 shadow-md">
                      <span className="text-white text-lg">👥</span>
                    </div>
                    <p className="text-[10px] text-[#7A3A3A] font-semibold">{selectedRecipe.nb_personnes} pers</p>
                  </div>
                )}
                {selectedRecipe.calories && (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] flex items-center justify-center mx-auto mb-2 shadow-md">
                      <span className="text-white text-lg">🔥</span>
                    </div>
                    <p className="text-[10px] text-[#7A3A3A] font-semibold">{selectedRecipe.calories} Cal</p>
                  </div>
                )}
                {selectedRecipe.difficulte && (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] flex items-center justify-center mx-auto mb-2 shadow-md">
                      <span className="text-white text-lg">
                        {selectedRecipe.difficulte.toLowerCase().includes("facile") ? "✓" : "="}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#7A3A3A] font-semibold">{selectedRecipe.difficulte}</p>
                  </div>
                )}
              </div>

              {selectedRecipe.description_courte && (
                <p className="text-sm text-[#6B2E2E] mb-6 leading-relaxed">
                  {selectedRecipe.description_courte}
                </p>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-bold text-[#6B2E2E] uppercase tracking-wide">Ingrédients</h3>
                </div>
                <ul className="space-y-2">
                  {selectedRecipe.ingredients
                    .split(";")
                    .filter((item) => item.trim().length > 0)
                    .map((item, idx) => {
                      const trimmed = item.trim();
                      return (
                        <li key={idx} className="flex items-start gap-3 text-[#6B2E2E]">
                          <span className="text-[#D44A4A] mt-0.5 flex-shrink-0">→</span>
                          <span className="flex-1">{trimmed}</span>
                        </li>
                      );
                    })}
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#6B2E2E] uppercase tracking-wide mb-4">Préparation</h3>
                <ol className="space-y-3">
                  {selectedRecipe.instructions
                    .split(";")
                    .filter((item) => item.trim().length > 0)
                    .map((item, idx) => {
                      const trimmed = item.trim();
                      return (
                        <li key={idx} className="flex gap-3 text-[#6B2E2E]">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D44A4A] text-white text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="flex-1 leading-relaxed">{trimmed}</span>
                        </li>
                      );
                    })}
                </ol>
              </div>

              {/* Bouton pour ajouter/retirer d'une collection */}
              <div className="mb-3 space-y-2">
                <button
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] text-sm font-semibold text-white hover:from-[#C03A3A] hover:to-[#6B5F3F] transition-all shadow-md"
                  onClick={() => {
                    if (typeof window !== "undefined" && selectedRecipe) {
                      // Sauvegarder la recette à ajouter au menu
                      localStorage.setItem("foodlane_recipe_to_add", JSON.stringify(selectedRecipe));
                      // Rediriger vers la page du menu
                      window.location.href = "/menu-semaine";
                    }
                  }}
                >
                  📅 Ajouter au menu
                </button>
                <button
                  className="w-full px-4 py-3 rounded-xl bg-[var(--beige-card-alt)] border border-[var(--beige-border)] text-sm text-[var(--text-primary)] font-semibold hover:border-[var(--beige-accent)] transition-colors"
                  onClick={() => {
                    setRecipeToAdd(selectedRecipe);
                    setShowAddToCollection(true);
                  }}
                >
                  📁 Gérer les collections
                </button>
                {selectedCollection && (
                  <button
                    className="w-full px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-semibold hover:border-red-300 transition-colors"
                    onClick={() => {
                      if (confirm(`Retirer "${selectedRecipe.nom}" de la collection "${selectedCollection.name}" ?`)) {
                        handleRemoveFromCollection(selectedCollection.id, selectedRecipe.id);
                        setSelectedRecipe(null);
                      }
                    }}
                  >
                    ➖ Retirer de cette collection
                  </button>
                )}
              </div>

              <button
                className="w-full px-4 py-3 rounded-xl bg-[#D44A4A] border border-[#C03A3A] text-sm font-semibold text-white hover:bg-[#C03A3A] transition-colors"
                onClick={() => setSelectedRecipe(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
