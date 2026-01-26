"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Recipe } from "./src/lib/recipes";
import { loadFavorites, saveFavorites } from "./src/lib/favorites";
import {
  type Collection,
  loadCollections,
  addRecipeToCollection,
  removeRecipeFromCollection,
} from "./src/lib/collections";
import RecipeImage from "./components/RecipeImage";
import { loadPreferences } from "./src/lib/userPreferences";
import CameraCapture from "./components/CameraCapture";
import { 
  filterRecipesByDietaryProfile, 
  filterRecipesByEquipment, 
  detectDietaryBadges,
  DIETARY_BADGE_ICONS,
  type DietaryProfile 
} from "./src/lib/dietaryProfiles";
import { filterRecipesBySeason, getCurrentSeason, getSeasonName } from "./src/lib/seasonalFilter";
import { useTranslation } from "./components/TranslationProvider";
import { useSwipeBack } from "./hooks/useSwipeBack";
import { usePremium } from "./contexts/PremiumContext";
import { useSupabaseSession } from "./hooks/useSupabaseSession";


export default function Home() {
  const { t } = useTranslation();
  const { refreshProfile } = usePremium();
  const { user } = useSupabaseSession();
  const searchParams = useSearchParams();
  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [results, setResults] = useState<Recipe[]>([]);
  const [lessRelevantResults, setLessRelevantResults] = useState<Recipe[]>([]);
  const [showCalories, setShowCalories] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [popularRecipes, setPopularRecipes] = useState<Recipe[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [recipeRatings, setRecipeRatings] = useState<Record<string, number[]>>({});
  const [userPrenom, setUserPrenom] = useState<string>("");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [currentIngredientInput, setCurrentIngredientInput] = useState<string>("");
  const [recipeTypeFilter, setRecipeTypeFilter] = useState<"all" | "sweet" | "savory">("all");
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [recipeToAddToCollection, setRecipeToAddToCollection] = useState<Recipe | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [favoriteSuccessMessage, setFavoriteSuccessMessage] = useState<string | null>(null);

  // Geste de balayage pour revenir en arrière
  useSwipeBack(() => {
    if (showResultsPanel) {
      if (selectedRecipe) {
        // Si on vient des recettes du moment (results est vide), fermer complètement le panneau
        // Sinon, revenir à la liste de résultats
        if (results.length === 0) {
          setSelectedRecipe(null);
          setShowResultsPanel(false);
        } else {
          setSelectedRecipe(null); // Retour à la liste
        }
      } else {
        setShowResultsPanel(false); // Fermer le panneau
      }
    }
  }, showResultsPanel);

  const preferences = loadPreferences();

  // Fonctions pour gérer les notes
  const loadRatings = (): Record<string, number[]> => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem("foodlane_ratings");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveRating = (recipeId: string, rating: number) => {
    if (typeof window === "undefined") return;
    const ratings = loadRatings();
    if (!ratings[recipeId]) {
      ratings[recipeId] = [];
    }
    ratings[recipeId].push(rating);
    localStorage.setItem("foodlane_ratings", JSON.stringify(ratings));
    setRecipeRatings(ratings);
  };

  const getAverageRating = (recipeId: string): number => {
    const ratings = recipeRatings[recipeId] || [];
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / ratings.length) * 10) / 10; // Arrondi à 1 décimale
  };

  useEffect(() => {
    // Charger les favoris et collections depuis Supabase au démarrage
    const loadData = async () => {
      const loadedFavorites = await loadFavorites();
      const loadedCollections = await loadCollections();
      // Chargement initial des favoris
      setFavorites(loadedFavorites);
      setCollections(loadedCollections);
      
      const preferences = loadPreferences();
      setUserPrenom(preferences.prenom || "");
      setShowCalories(preferences.afficherCalories);
      setRecipeRatings(loadRatings());
      await loadPopularRecipes();
    };
    
    loadData();
    
    // Écouter les changements de favoris depuis d'autres pages
    const handleFavoritesUpdated = async () => {
      const updated = await loadFavorites();
      // Favoris mis à jour depuis un autre composant
      setFavorites(updated);
    };
    
    window.addEventListener("favoritesUpdated", handleFavoritesUpdated);
    
    // Écouter le focus de la fenêtre pour rafraîchir le profil
    // (quand l'utilisateur revient d'un autre onglet comme Stripe)
    // Utiliser un debounce pour éviter les appels trop fréquents
    let focusTimeout: NodeJS.Timeout | null = null;
    const handleFocus = () => {
      // Debounce : attendre 1 seconde après le focus avant de rafraîchir
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      focusTimeout = setTimeout(async () => {
        await refreshProfile();
      }, 1000);
    };
    
    window.addEventListener("focus", handleFocus);
    
    return () => {
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdated);
      window.removeEventListener("focus", handleFocus);
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dépendances vides : ne s'exécute qu'une fois au montage

  // Fonction INDÉPENDANTE pour charger les "Recettes du moment"
  // Cette fonction est complètement séparée de la génération de recettes par ingrédients
  async function loadPopularRecipes() {
    setLoadingPopular(true);
    try {
      // Chargement des recettes du moment
      
      const res = await fetch("/api/recipes", {
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!res.ok) {
        throw new Error(`Erreur API: ${res.status}`);
      }
      
      const data = await res.json();
      const allRecipes: Recipe[] = data.recipes || [];
      
      // Recettes récupérées depuis l'API
      
      if (allRecipes.length === 0) {
        console.warn("[RecettesDuMoment] ⚠️ Aucune recette disponible");
        setPopularRecipes([]);
        return;
      }
      
      // FILTRER PAR SAISON (c'est le critère principal pour "Recettes du moment")
      let seasonalRecipes = filterRecipesBySeason(allRecipes);
      // Filtrage par saison
      
      // Si pas assez de recettes de saison, prendre toutes les recettes
      if (seasonalRecipes.length < 4) {
        // Pas assez de recettes de saison, on prend toutes les recettes
        seasonalRecipes = allRecipes;
      }
      
      // Séparer les recettes salées et sucrées
      const normalizeType = (type: string): string => {
        return (type || "").toLowerCase().trim();
      };
      
      const savoryRecipes = seasonalRecipes.filter(recipe => {
        const type = normalizeType(recipe.type);
        return type.includes("salé") || type.includes("sale") || type.includes("sal");
      });
      
      const sweetRecipes = seasonalRecipes.filter(recipe => {
        const type = normalizeType(recipe.type);
        return type.includes("sucré") || type.includes("sucree") || type.includes("sucr");
      });
      
      console.log(`[RecettesDuMoment] ${savoryRecipes.length} salées, ${sweetRecipes.length} sucrées de saison`);
      
      // Mélange aléatoire amélioré (Fisher-Yates shuffle)
      const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };
      
      const shuffledSavory = shuffleArray(savoryRecipes);
      const shuffledSweet = shuffleArray(sweetRecipes);
      
      // Sélectionner 4 recettes : majoritairement salées (3) + au moins 1 sucrée (1)
      const selectedRecipes: Recipe[] = [];
      
      // Prendre 3 recettes salées
      if (shuffledSavory.length > 0) {
        selectedRecipes.push(...shuffledSavory.slice(0, 3));
      }
      
      // Prendre au moins 1 recette sucrée si disponible
      if (shuffledSweet.length > 0) {
        selectedRecipes.push(shuffledSweet[0]);
      } else if (shuffledSavory.length > 3) {
        // Si pas de recette sucrée disponible, prendre une 4ème recette salée
        selectedRecipes.push(shuffledSavory[3]);
      }
      
      // Si on n'a pas assez de recettes, compléter avec des recettes aléatoires
      if (selectedRecipes.length < 4) {
        const remaining = seasonalRecipes.filter(r => !selectedRecipes.includes(r));
        const shuffledRemaining = shuffleArray(remaining);
        selectedRecipes.push(...shuffledRemaining.slice(0, 4 - selectedRecipes.length));
      }
      
      // Limiter à 4 recettes maximum
      const finalRecipes = selectedRecipes.slice(0, 4);
      
      console.log(`[RecettesDuMoment] ${finalRecipes.filter(r => {
        const type = normalizeType(r.type);
        return type.includes("salé") || type.includes("sale") || type.includes("sal");
      }).length} salées, ${finalRecipes.filter(r => {
        const type = normalizeType(r.type);
        return type.includes("sucré") || type.includes("sucree") || type.includes("sucr");
      }).length} sucrées sélectionnées`);
      
      setPopularRecipes(finalRecipes);
      
      // Si le paramètre showRecipes est présent, afficher les recettes suggérées
      const showRecipes = searchParams?.get("showRecipes");
      if (showRecipes === "true" && finalRecipes.length > 0) {
        setResults(finalRecipes);
        setShowResultsPanel(true);
        // Nettoyer l'URL en retirant le paramètre
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/");
        }
      }
    } catch (error) {
      console.error("[RecettesDuMoment] ❌ Erreur lors du chargement des recettes du moment:", error);
      setPopularRecipes([]);
    } finally {
      setLoadingPopular(false);
    }
  }

  // Fonction pour ajouter un ingrédient à la liste
  const handleAddIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim();
    if (trimmed && !selectedIngredients.includes(trimmed.toLowerCase())) {
      setSelectedIngredients([...selectedIngredients, trimmed.toLowerCase()]);
      setCurrentIngredientInput("");
    }
  };

  // Fonction pour supprimer un ingrédient
  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setSelectedIngredients(selectedIngredients.filter(ing => ing !== ingredientToRemove));
  };

  // Fonction pour gérer les touches Espace et Enter dans le champ de saisie
  const handleIngredientInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentIngredientInput.trim()) {
        handleAddIngredient(currentIngredientInput);
      }
    } else if (e.key === " ") {
      // Pour l'espace, on ajoute l'ingrédient avant l'espace
      e.preventDefault();
      const textBeforeSpace = currentIngredientInput.trim();
      if (textBeforeSpace) {
        handleAddIngredient(textBeforeSpace);
      }
    }
  };

  async function handleGenerateRecipes() {
    // Utiliser la liste d'ingrédients sélectionnés au lieu du champ texte
    const ingredientsToSearch = selectedIngredients.length > 0 
      ? selectedIngredients.join(", ")
      : "";
    
    // Permettre la génération si des ingrédients sont renseignés OU si un type est sélectionné (sucré/salé)
    if (!ingredientsToSearch && recipeTypeFilter === "all") {
      setGenerateError("Veuillez renseigner des ingrédients ou sélectionner un type de recette (sucré/salé)");
      return;
    }

    setLoadingGenerate(true);
    setSelectedRecipe(null);
    setGenerateError(null);

    try {
      // Construire l'URL de recherche avec les paramètres
      const searchParams = new URLSearchParams();
      if (ingredientsToSearch) {
        searchParams.set("ingredients", selectedIngredients.join(","));
      }
      if (recipeTypeFilter !== "all") {
        searchParams.set("type", recipeTypeFilter);
      }
      if (user?.id) {
        searchParams.set("userId", user.id);
      }

      const searchUrl = `/api/recipes/search?${searchParams.toString()}`;
      console.log("[Generate] Recherche via API:", searchUrl);

      const res = await fetch(searchUrl, {
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!res.ok) {
        let errorMessage = `Erreur de l'API: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error("[Generate] Erreur API détaillée:", res.status, errorData);
        } catch (e) {
          const errorText = await res.text().catch(() => "");
          console.error("[Generate] Erreur API (texte):", res.status, errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      const results: Recipe[] = data.results || [];
      const suggestions: Recipe[] = data.suggestions || [];
      const lessRelevant: Recipe[] = data.lessRelevant || [];
      const meta = data.meta || {};

      console.log(`[Generate] ${results.length} résultats, ${suggestions.length} suggestions, ${lessRelevant.length} moins pertinentes`);
      console.log("[Generate] Meta:", meta);

      // Gérer les résultats et suggestions
      let bestRecipes: Recipe[] = [];
      let lessRelevantRecipes: Recipe[] = [];
      let errorMessage: string | null = null;

      if (results.length > 0) {
        // Résultats exacts trouvés
        bestRecipes = results; // Utiliser tous les résultats pertinents (déjà limités par l'API)
        lessRelevantRecipes = lessRelevant; // Recettes moins pertinentes mais faisables
        console.log(`[Generate] ✅ ${bestRecipes.length} résultats exacts trouvés, ${lessRelevantRecipes.length} moins pertinentes`);
      } else if (suggestions.length > 0) {
        // Aucun résultat exact, mais des suggestions disponibles
        bestRecipes = suggestions;
        errorMessage = "Aucune recette n'a été trouvée avec votre combinaison d'aliments, mais voici des idées que vous pouvez utiliser :";
        console.log(`[Generate] ⚠️ Aucun résultat exact, ${bestRecipes.length} suggestions affichées`);
      } else {
        // Aucun résultat du tout
        errorMessage = "Aucune recette disponible. Vérifiez la configuration de la base de données.";
        console.warn("[Generate] ⚠️ Aucune recette trouvée");
      }

      // Afficher les filtres actifs si disponibles
      if (meta.filters && (meta.filters.allergies.length > 0 || meta.filters.diets.length > 0)) {
        const activeFilters: string[] = [];
        if (meta.filters.allergies.length > 0) {
          activeFilters.push(`Allergies: ${meta.filters.allergies.join(", ")}`);
        }
        if (meta.filters.diets.length > 0) {
          activeFilters.push(`Régimes: ${meta.filters.diets.join(", ")}`);
        }
        console.log(`[Generate] Filtres actifs: ${activeFilters.join(" | ")}`);
      }

      // Stocker les recettes moins pertinentes dans un state séparé
      setResults(bestRecipes);
      setLessRelevantResults(lessRelevantRecipes);
      setGenerateError(errorMessage);
      setShowResultsPanel(true);
      
      console.log(`[Generate] ✅ ${bestRecipes.length} recettes générées et affichées (indépendantes des recettes du moment)`);
    } catch (error) {
      console.error("[Generate] ❌ Erreur lors de la génération de recettes:", error);
      if (error instanceof Error) {
        console.error("[Generate] Message d'erreur:", error.message);
        console.error("[Generate] Stack:", error.stack);
        setGenerateError(`Erreur: ${error.message}`);
      } else {
        setGenerateError("Une erreur est survenue lors de la génération des recettes.");
      }
      // Afficher un message d'erreur à l'utilisateur
      setResults([]);
      setShowResultsPanel(true);
    } finally {
      setLoadingGenerate(false);
    }
  }

  useEffect(() => {
    // Ne sauvegarder que si les favoris ont vraiment changé (éviter d'écraser une sauvegarde récente)
    // Cette sauvegarde est un backup, la sauvegarde principale se fait dans toggleFavorite
    const syncFavorites = async () => {
      const currentSaved = await loadFavorites();
      const currentIds = currentSaved.map(f => f.id).sort().join(',');
      const newIds = favorites.map(f => f.id).sort().join(',');
      
      // Seulement sauvegarder si différent ET si on a au moins un favori (pour éviter d'écraser)
      if (currentIds !== newIds && favorites.length > 0) {
        console.log("[Favorites] Sauvegarde de backup depuis useEffect");
        await saveFavorites(favorites);
      }
    };
    syncFavorites();
  }, [favorites]);


  function isFavorite(recipeId: string): boolean {
    // Vérifier dans l'état
    return favorites.some((fav) => fav.id === recipeId);
  }

  async function toggleFavorite(recipe: Recipe) {
    // Vérifier que la recette est valide
    if (!recipe || !recipe.id || !recipe.nom) {
      console.error("[Favorites] Tentative d'ajouter une recette invalide:", recipe);
      return;
    }

    console.log("[Favorites] toggleFavorite appelé pour:", recipe.nom, "ID:", recipe.id);

    // Charger les favoris actuels depuis Supabase
    const currentFavorites = await loadFavorites();
    console.log("[Favorites] Favoris actuels:", currentFavorites.length, currentFavorites.map(f => f.id));
    
    const exists = currentFavorites.some((fav) => fav.id === recipe.id);
    
    if (exists) {
      // Si la recette est déjà en favoris, la retirer directement
      const newFavorites = currentFavorites.filter((fav) => fav.id !== recipe.id);
      console.log(`[Favorites] Recette "${recipe.nom}" retirée des favoris`);
      await saveFavorites(newFavorites);
      setFavorites(newFavorites);
      
      // Retirer aussi de toutes les collections
      const currentCollections = await loadCollections();
      for (const collection of currentCollections) {
        if (collection.recipeIds.includes(recipe.id)) {
          await removeRecipeFromCollection(collection.id, recipe.id);
        }
      }
      const updatedCollections = await loadCollections();
      setCollections(updatedCollections);
    } else {
      // Si la recette n'est pas en favoris, l'ajouter TOUJOURS aux favoris d'abord
      const recipeCopy: Recipe = {
        id: recipe.id,
        type: recipe.type || "",
        difficulte: recipe.difficulte || "",
        temps_preparation_min: recipe.temps_preparation_min || 0,
        categorie_temps: recipe.categorie_temps || "",
        nb_personnes: recipe.nb_personnes || 0,
        nom: recipe.nom,
        description_courte: recipe.description_courte || "",
        ingredients: recipe.ingredients || "",
        instructions: recipe.instructions || "",
        equipements: recipe.equipements || "",
        calories: recipe.calories,
        image_url: recipe.image_url,
      };
      const newFavorites = [...currentFavorites, recipeCopy];
      await saveFavorites(newFavorites);
      setFavorites(newFavorites);
      console.log(`[Favorites] Recette "${recipe.nom}" ajoutée aux favoris`);
      
      // Afficher un message de succès
      setFavoriteSuccessMessage("Recette ajoutée aux favoris avec succès");
      // Masquer le message après 3 secondes
      setTimeout(() => {
        setFavoriteSuccessMessage(null);
      }, 3000);
      
      // Ne plus ouvrir automatiquement le modal de collection
      // L'utilisateur peut ajouter à une collection manuellement depuis la fiche recette si souhaité
    }
  }

  async function handleAddToCollection(collectionId: string) {
    if (!recipeToAddToCollection) return;
    
    // La recette est déjà dans les favoris (ajoutée dans toggleFavorite)
    // Il suffit de l'ajouter à la collection
    await addRecipeToCollection(collectionId, recipeToAddToCollection.id);
    const updated = await loadCollections();
    setCollections(updated);
  }

  async function handleRemoveFromCollection(collectionId: string, recipeId: string) {
    await removeRecipeFromCollection(collectionId, recipeId);
    const updated = await loadCollections();
    setCollections(updated);
  }


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 18) return "Bonjour";
    return "Bonsoir";
  };

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-6">
      {/* Message de succès pour l'ajout aux favoris */}
      {favoriteSuccessMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] bg-gradient-to-r from-[#D44A4A] to-[#C03A3A] text-white px-6 py-4 rounded-xl shadow-2xl border-2 border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-bold">✓</span>
            </div>
            <p className="text-sm font-semibold">{favoriteSuccessMessage}</p>
          </div>
        </div>
      )}
      {/* Header avec message de bienvenue - style moderne */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#6B2E2E] mb-1">
          {userPrenom ? `${getGreeting()}, ${userPrenom} !` : getGreeting() + " !"}
        </h1>
        <p className="text-base text-[#7A3A3A] font-medium">
          Génère des recettes à partir des aliments de ton frigo
        </p>
      </header>

      {/* Outil de génération de recettes */}
      <section className="mb-6 rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] p-4">
        <h3 className="text-lg font-bold text-[#6B2E2E] mb-3">
          🍳 Générer des recettes
        </h3>
        <p className="text-sm text-[#7A3A3A] mb-4">
          Entrez un ingrédient et appuyez sur Espace pour l'ajouter
        </p>

        {/* Affichage des ingrédients sélectionnés */}
        {selectedIngredients.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedIngredients.map((ingredient, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D44A4A] text-white text-xs font-medium"
              >
                <span>{ingredient}</span>
                <button
                  onClick={() => handleRemoveIngredient(ingredient)}
                  className="hover:bg-[#C03A3A] rounded-full p-0.5 transition-colors"
                  aria-label={`Supprimer ${ingredient}`}
                >
                  ✕
                </button>
              </div>
              ))}
          </div>
        )}

        <div className="relative mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
          <input
            type="text"
                className="w-full rounded-xl bg-white border border-[var(--beige-border)] px-4 py-3 pl-12 pr-4 text-sm outline-none focus:border-[#D44A4A] text-[#6B2E2E] placeholder:text-[var(--text-muted)]"
                placeholder="Tapez un ingrédient..."
            value={currentIngredientInput}
            onChange={(e) => setCurrentIngredientInput(e.target.value)}
            onKeyDown={handleIngredientInputKeyDown}
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A3A3A] text-lg">🔍</span>
            </div>
            <button
              onClick={() => {
                if (currentIngredientInput.trim()) {
                  handleAddIngredient(currentIngredientInput);
                }
              }}
              disabled={!currentIngredientInput.trim()}
              className="px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Ajouter
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Appuyez sur <kbd className="px-1.5 py-0.5 bg-[var(--beige-card)] rounded text-[var(--foreground)]">Espace</kbd> ou <kbd className="px-1.5 py-0.5 bg-[var(--beige-card)] rounded text-[var(--foreground)]">Entrée</kbd> pour ajouter, ou cliquez sur "Ajouter"
          </p>
        </div>

        {/* Filtre par type (sucré/salé) */}
        <div className="mb-4">
          <p className="text-xs text-[#7A3A3A] mb-2">Type de recettes :</p>
          <div className="flex gap-2">
            <button
              onClick={() => setRecipeTypeFilter("all")}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                recipeTypeFilter === "all"
                  ? "bg-[#D44A4A] text-white"
                  : "bg-white border border-[var(--beige-border)] text-[#6B2E2E] hover:bg-[var(--beige-rose)]"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setRecipeTypeFilter("sweet")}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                recipeTypeFilter === "sweet"
                  ? "bg-[#D44A4A] text-white"
                  : "bg-white border border-[var(--beige-border)] text-[#6B2E2E] hover:bg-[var(--beige-rose)]"
              }`}
            >
              Sucré
            </button>
            <button
              onClick={() => setRecipeTypeFilter("savory")}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                recipeTypeFilter === "savory"
                  ? "bg-[#D44A4A] text-white"
                  : "bg-white border border-[var(--beige-border)] text-[#6B2E2E] hover:bg-[var(--beige-rose)]"
              }`}
            >
              Salé
            </button>
          </div>
        </div>

        <button
          className="w-full px-4 py-3.5 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          disabled={(selectedIngredients.length === 0 && recipeTypeFilter === "all") || loadingGenerate}
          onClick={handleGenerateRecipes}
        >
          {loadingGenerate ? "Génération en cours..." : "Générer des recettes"}
        </button>
        
        {generateError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{generateError}</p>
        </div>
        )}
      </section>

      {/* Bloc Photo */}
      <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1 text-[var(--text-primary)]">📷 Photo de frigo</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Prends une photo de ton frigo pour identifier tes ingrédients
            </p>
            <p className="text-xs text-[#D44A4A] font-medium mt-1">
              ⏳ Bientôt disponible
            </p>
          </div>
          <button
            disabled
            className="px-4 py-2 rounded-xl bg-gray-300 text-xs font-semibold text-gray-500 cursor-not-allowed flex-shrink-0 opacity-60"
          >
            Prendre une photo
          </button>
        </div>
      </section>

      {/* Aperçu de la photo capturée */}
      {capturedImage && (
        <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Photo capturée</h3>
            <button
              onClick={() => setCapturedImage(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm p-1"
            >
              ✕
            </button>
          </div>
          <img
            src={capturedImage}
            alt="Photo du frigo"
            className="w-full rounded-xl mb-3 border border-[var(--beige-border)]"
          />
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            💡 La détection automatique des ingrédients sera bientôt disponible.
          </p>
          <button
            onClick={() => {
              setCapturedImage(null);
              setShowCamera(true);
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-[#D44A4A] text-white text-xs font-semibold hover:bg-[#C03A3A] transition-colors"
          >
            📷 Reprendre une photo
          </button>
        </section>
      )}

      {/* Composant de prise de photo */}
      {showCamera && (
        <CameraCapture
          onCapture={(imageDataUrl) => {
            setCapturedImage(imageDataUrl);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
          title="Photo de ton frigo"
        />
      )}

      {/* Section Recettes du moment - déplacée en bas */}
      {popularRecipes.length > 0 && (
        <section className="mb-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#6B2E2E] flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <span>Recettes du moment</span>
              </h3>
              <button
                onClick={async () => {
                  // Charger environ 10 recettes du moment pour "Voir tout"
                  setLoadingGenerate(true);
                  try {
                    const res = await fetch("/api/recipes", {
                      cache: "no-store",
                      headers: {
                        'Cache-Control': 'no-cache',
                      },
                    });
                    
                    if (!res.ok) {
                      throw new Error(`Erreur API: ${res.status}`);
                    }
                    
                    const data = await res.json();
                    const allRecipes: Recipe[] = data.recipes || [];
                    
                    // Filtrer par saison
                    let seasonalRecipes = filterRecipesBySeason(allRecipes);
                    if (seasonalRecipes.length < 10) {
                      seasonalRecipes = allRecipes;
                    }
                    
                    // Séparer les recettes salées et sucrées
                    const normalizeType = (type: string): string => {
                      return (type || "").toLowerCase().trim();
                    };
                    
                    const savoryRecipes = seasonalRecipes.filter(recipe => {
                      const type = normalizeType(recipe.type);
                      return type.includes("salé") || type.includes("sale") || type.includes("sal");
                    });
                    
                    const sweetRecipes = seasonalRecipes.filter(recipe => {
                      const type = normalizeType(recipe.type);
                      return type.includes("sucré") || type.includes("sucree") || type.includes("sucr");
                    });
                    
                    // Mélange aléatoire amélioré (Fisher-Yates shuffle)
                    const shuffleArray = <T,>(array: T[]): T[] => {
                      const shuffled = [...array];
                      for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                      }
                      return shuffled;
                    };
                    
                    const shuffledSavory = shuffleArray(savoryRecipes);
                    const shuffledSweet = shuffleArray(sweetRecipes);
                    
                    // Sélectionner 10 recettes : majoritairement salées (7-8) + quelques sucrées (2-3)
                    const allPopularRecipes: Recipe[] = [];
                    
                    // Prendre 7-8 recettes salées
                    if (shuffledSavory.length > 0) {
                      const savoryCount = Math.min(8, shuffledSavory.length);
                      allPopularRecipes.push(...shuffledSavory.slice(0, savoryCount));
                    }
                    
                    // Prendre 2-3 recettes sucrées si disponibles
                    if (shuffledSweet.length > 0) {
                      const sweetCount = Math.min(3, shuffledSweet.length, 10 - allPopularRecipes.length);
                      allPopularRecipes.push(...shuffledSweet.slice(0, sweetCount));
                    }
                    
                    // Si on n'a pas assez de recettes, compléter avec des recettes aléatoires
                    if (allPopularRecipes.length < 10) {
                      const remaining = seasonalRecipes.filter(r => !allPopularRecipes.includes(r));
                      const shuffledRemaining = shuffleArray(remaining);
                      allPopularRecipes.push(...shuffledRemaining.slice(0, 10 - allPopularRecipes.length));
                    }
                    
                    // Limiter à 10 recettes maximum
                    const finalRecipes = allPopularRecipes.slice(0, 10);
                    setResults(finalRecipes);
                    setShowResultsPanel(true);
                    console.log(`[RecettesDuMoment] ${allPopularRecipes.length} recettes chargées pour "Voir tout"`);
                  } catch (error) {
                    console.error("[RecettesDuMoment] Erreur lors du chargement:", error);
                    // En cas d'erreur, afficher au moins les 4 recettes de la page d'accueil
                    setResults(popularRecipes);
                    setShowResultsPanel(true);
                  } finally {
                    setLoadingGenerate(false);
                  }
                }}
                className="text-sm text-[#D44A4A] font-semibold hover:text-[#C03A3A]"
                disabled={loadingGenerate}
              >
                {loadingGenerate ? "Chargement..." : "Voir tout →"}
              </button>
            </div>
          {loadingPopular ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#7A3A3A]">Chargement...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {popularRecipes.map((recipe) => (
                <article
                  key={recipe.id}
                  className="cursor-pointer group"
                onClick={() => {
                    setSelectedRecipe(recipe);
                    setShowResultsPanel(true);
                  }}
                >
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2 bg-gray-100 shadow-md group-hover:shadow-lg transition-shadow">
                    {recipe.image_url ? (
                      <RecipeImage
                        imageUrl={recipe.image_url}
                        alt={recipe.nom}
                        className="w-full h-full"
                        fallbackClassName="rounded-2xl"
                        priority={false}
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] flex items-center justify-center rounded-2xl">
                        <span className="text-4xl">🍽️</span>
                      </div>
                    )}
                    {/* Badge temps en overlay en haut à gauche */}
                    {recipe.temps_preparation_min > 0 && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold flex items-center gap-1">
                        <span>⏱</span>
                        <span>{recipe.temps_preparation_min} min</span>
                    </div>
                    )}
                    {/* Badge favori en overlay en haut à droite */}
                  <button
                      className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm transition-all ${
                        isFavorite(recipe.id)
                          ? "bg-[#C03A3A]/90 text-white"
                          : "bg-white/80 text-[#7A3A3A] hover:bg-white"
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(recipe);
                      }}
                      aria-label={
                        isFavorite(recipe.id)
                          ? "Retirer des favoris"
                          : "Ajouter aux favoris"
                      }
                    >
                      {isFavorite(recipe.id) ? "★" : "☆"}
              </button>
            </div>
                  <h4 className="font-semibold text-sm text-[#6B2E2E] text-center leading-tight px-1 line-clamp-2">
                    {recipe.nom}
                  </h4>
                </article>
              ))}
            </div>
          )}
        </section>
      )}


      {/* Fenêtre résultats plein écran */}
      {showResultsPanel && (
        <div className="fixed inset-0 bg-[#FFF0F0] z-50 flex flex-col max-w-md mx-auto">
            {selectedRecipe ? (
            /* ----- Vue détaillée d'une recette - Style adapté mobile avec couleurs Foodlane ----- */
            <div className="flex flex-col h-full">
              {/* Image principale en haut - adaptée mobile */}
              <div className="relative w-full h-64 flex-shrink-0">
                {selectedRecipe.image_url ? (
                    <RecipeImage
                      imageUrl={selectedRecipe.image_url}
                      alt={selectedRecipe.nom}
                      className="w-full h-full"
                      fallbackClassName=""
                      priority={true}
                      sizes="100vw"
                    />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] flex items-center justify-center">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}

                {/* Bouton retour en haut à gauche - cercle marron Foodlane */}
                <button
                  className="absolute top-4 left-4 w-10 h-10 rounded-full bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] shadow-lg flex items-center justify-center hover:from-[#C03A3A] hover:to-[#6B5F3F] transition-all"
                  onClick={() => {
                    // Si on vient des recettes du moment (results est vide), fermer complètement le panneau
                    // Sinon, revenir à la liste de résultats
                    if (results.length === 0) {
                      setSelectedRecipe(null);
                      setShowResultsPanel(false);
                    } else {
                      setSelectedRecipe(null);
                    }
                  }}
                  aria-label="Retour"
                >
                  <span className="text-white text-lg font-bold">←</span>
                </button>
                
                {/* Boutons favori et partage en haut à droite */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {/* Bouton cœur favori */}
                  <button
                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all hover:bg-white"
                    onClick={() => toggleFavorite(selectedRecipe)}
                    aria-label={
                      isFavorite(selectedRecipe.id)
                        ? "Retirer des favoris"
                        : "Ajouter aux favoris"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill={isFavorite(selectedRecipe.id) ? "#EF4444" : "none"}
                      stroke={isFavorite(selectedRecipe.id) ? "#EF4444" : "#6B2E2E"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-6 h-6 transition-all"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                  
                  {/* Bouton partage */}
                  <button
                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all hover:bg-white"
                    onClick={() => {
                      if (navigator.share && selectedRecipe) {
                        navigator.share({
                          title: selectedRecipe.nom,
                          text: selectedRecipe.description_courte || "",
                          url: window.location.href,
                        }).catch(() => {});
                      }
                    }}
                    aria-label="Partager la recette"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6B2E2E"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-6 h-6 transition-all"
                    >
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  </button>
                </div>

              </div>

              {/* Carte beige en bas avec coins arrondis en haut */}
              <div className="flex-1 bg-[#FFF0F0] rounded-t-3xl -mt-6 relative z-10 overflow-y-auto px-4 pt-6 pb-8 scrollbar-hide">
                {/* Indicateur de glissement en haut de la carte */}
                <div className="w-12 h-1 bg-[#E8A0A0] rounded-full mx-auto mb-4"></div>
                
                {/* Titre et type de cuisine */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-[#6B2E2E] mb-1">
                    {selectedRecipe.nom}
                  </h2>
                      {selectedRecipe.type && (
                    <p className="text-xs text-[#7A3A3A]">
                          {selectedRecipe.type}
                    </p>
                  )}
                </div>

                {/* Badge de note marron Foodlane */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] shadow-md">
                    <span className="text-white font-bold text-xs">
                      ★ {getAverageRating(selectedRecipe.id) > 0 ? getAverageRating(selectedRecipe.id).toFixed(1) : "—"}
                        </span>
                  </div>
                  {getAverageRating(selectedRecipe.id) > 0 && (
                    <span className="text-xs text-[#7A3A3A]">
                      ({recipeRatings[selectedRecipe.id]?.length || 0} avis)
                        </span>
                      )}
                </div>

                {/* Métriques en pilules marron Foodlane avec infos de la recette */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {selectedRecipe.type && (
                    <div className="bg-gradient-to-b from-[#D44A4A] to-[#C03A3A] rounded-xl p-2.5 text-center shadow-md">
                      <div className="flex justify-center mb-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          {/* Document avec lignes */}
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                      <p className="text-[9px] font-semibold text-white leading-tight">
                        {selectedRecipe.type.toLowerCase().includes("sucré") ? "Sucré" : "Salé"}
                      </p>
                    </div>
                  )}
                  {selectedRecipe.difficulte && (
                    <div className="bg-gradient-to-b from-[#D44A4A] to-[#C03A3A] rounded-xl p-2.5 text-center shadow-md">
                      <div className="flex justify-center mb-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          {selectedRecipe.difficulte.toLowerCase().includes("facile") ? (
                            <polyline points="20 6 9 17 4 12"></polyline>
                          ) : selectedRecipe.difficulte.toLowerCase().includes("moyen") ? (
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          ) : (
                            <>
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </>
                          )}
                        </svg>
                      </div>
                      <p className="text-[9px] font-semibold text-white leading-tight">
                        {selectedRecipe.difficulte}
                      </p>
                    </div>
                  )}
                  {selectedRecipe.temps_preparation_min > 0 && (
                    <div className="bg-gradient-to-b from-[#D44A4A] to-[#C03A3A] rounded-xl p-2.5 text-center shadow-md">
                      <div className="flex justify-center mb-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                      <p className="text-[9px] font-semibold text-white">{selectedRecipe.temps_preparation_min} min</p>
                  </div>
                  )}
                  {selectedRecipe.nb_personnes > 0 && (
                    <div className="bg-gradient-to-b from-[#D44A4A] to-[#C03A3A] rounded-xl p-2.5 text-center shadow-md">
                      <div className="flex justify-center mb-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                </div>
                      <p className="text-[9px] font-semibold text-white">{selectedRecipe.nb_personnes} pers</p>
                  </div>
                )}
                </div>

                {/* Section Ingrédients avec puces marron Foodlane */}
                <div className="mb-6">
                  <h3 className="text-base font-bold text-[#6B2E2E] mb-3">Ingredients</h3>
                  <ul className="space-y-2.5">
                    {selectedRecipe.ingredients
                      .split(";")
                      .filter((item) => item.trim().length > 0)
                      .map((item, idx) => {
                        const trimmed = item.trim();
                        return (
                          <li key={idx} className="flex items-start gap-3 text-[#6B2E2E] text-xs">
                            <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] flex-shrink-0 mt-1.5"></span>
                            <span className="flex-1">{trimmed}</span>
                          </li>
                        );
                      })}
                  </ul>
                </div>

                {/* Section Directions avec puces marron Foodlane */}
                <div className="mb-6">
                  <h3 className="text-base font-bold text-[#6B2E2E] mb-3">Directions</h3>
                  <ol className="space-y-2.5">
                    {selectedRecipe.instructions
                      .split(";")
                      .filter((item) => item.trim().length > 0)
                      .map((item, idx) => {
                        const trimmed = item.trim();
                        return (
                          <li key={idx} className="flex items-start gap-3 text-[#6B2E2E] text-xs">
                            <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] flex-shrink-0 mt-1.5"></span>
                            <span className="flex-1 leading-relaxed">{trimmed}</span>
                          </li>
                        );
                      })}
                  </ol>
                </div>

                {/* Boutons d'action en bas */}
                <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-[#E8A0A0]">
                  <button
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] text-sm font-semibold text-white hover:from-[#C03A3A] hover:to-[#6B5F3F] transition-all shadow-md"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.setItem("foodlane_recipe_to_add", JSON.stringify(selectedRecipe));
                      window.location.href = "/menu-semaine";
                      }
                    }}
                  >
                    📅 Ajouter au menu
                  </button>
                  <button
                    className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-[#D44A4A] text-xs font-semibold text-[#6B2E2E] hover:bg-[#FFD9D9] transition-colors"
                    onClick={() => {
                      setShowRatingModal(true);
                      setUserRating(0);
                    }}
                  >
                    ⭐ Noter cette recette
                  </button>
                  <button
                    className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-[#E8A0A0] text-xs font-semibold text-[#6B2E2E] hover:border-[#D44A4A] transition-colors"
                    onClick={() => {
                      setSelectedRecipe(null);
                      setShowResultsPanel(false);
                    }}
                  >
                    ← Retour à la recherche
                  </button>
                </div>
                </div>
              </div>
            ) : (
              /* ----- Vue liste (4–5 recettes max) ----- */
            <div className="w-full h-full max-w-md bg-[#FFF0F0] border-l border-r border-[#E8A0A0] overflow-y-auto px-4 pt-4 pb-8 mx-auto scrollbar-hide">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#6B2E2E]">
                  Idées de repas
                </h3>
                <button
                  className="text-xs text-[#7A3A3A] hover:text-[#6B2E2E]"
                  onClick={() => {
                    setShowResultsPanel(false);
                    setSelectedRecipe(null);
                  }}
                >
                  Fermer ✕
                </button>
              </div>
              {results.length > 0 && (
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  Résultats triés par pertinence ({results.length} recette{results.length > 1 ? "s" : ""})
                </p>
              )}
              {generateError && (
                <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    {generateError}
                  </p>
                </div>
              )}
              {results.length === 0 && !generateError && (
                <p className="text-xs text-[var(--text-muted)] mb-2">
                    Aucune recette ne correspond encore à ces aliments. Tu peux
                    essayer avec d&apos;autres combinaisons ou moins
                    d&apos;ingrédients.
                  </p>
                )}

              {/* Grille moderne en 2 colonnes - style inspiré de l'image */}
              <div className="grid grid-cols-2 gap-4">
                  {results.map((recipe) => (
                    <article
                      key={recipe.id}
                    className="cursor-pointer group"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                    {/* Image de la recette - carrée avec coins arrondis */}
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2 bg-gray-100 shadow-md group-hover:shadow-lg transition-shadow">
                      {recipe.image_url ? (
                          <RecipeImage
                            imageUrl={recipe.image_url}
                            alt={recipe.nom}
                            className="w-full h-full"
                            fallbackClassName="rounded-2xl"
                            priority={false}
                            sizes="(max-width: 768px) 50vw, 33vw"
                          />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] flex items-center justify-center rounded-2xl">
                          <span className="text-4xl">🍽️</span>
                        </div>
                      )}
                      {/* Badge favori en overlay */}
                          <button
                        className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm transition-all ${
                              isFavorite(recipe.id)
                            ? "bg-[#C03A3A]/90 text-white"
                            : "bg-white/80 text-[#7A3A3A] hover:bg-white"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(recipe);
                            }}
                            aria-label={
                              isFavorite(recipe.id)
                                ? "Retirer des favoris"
                                : "Ajouter aux favoris"
                            }
                          >
                            {isFavorite(recipe.id) ? "★" : "☆"}
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
                    
                    {/* Nom de la recette en dessous */}
                    <h4 className="font-semibold text-sm text-[#6B2E2E] text-center leading-tight px-1 line-clamp-2">
                      {recipe.nom}
                    </h4>
                    </article>
                  ))}
                </div>

              {/* Section recettes moins pertinentes mais faisables */}
              {lessRelevantResults.length > 0 && (
                <div className="mt-8 pt-6 border-t-2 border-dashed border-[var(--beige-border)]">
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-800 font-semibold mb-1">
                      💡 Recettes moins pertinentes mais faisables
                    </p>
                    <p className="text-xs text-blue-700">
                      Ces recettes peuvent être réalisées avec tes ingrédients, mais elles sont moins adaptées à ta recherche. Tu auras peut-être besoin d&apos;ajouter quelques ingrédients supplémentaires.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {lessRelevantResults.map((recipe) => (
                      <article
                        key={recipe.id}
                        className="cursor-pointer group opacity-90 hover:opacity-100 transition-opacity"
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        {/* Image de la recette - carrée avec coins arrondis */}
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2 bg-gray-100 shadow-md group-hover:shadow-lg transition-shadow border-2 border-dashed border-[var(--beige-border)]">
                          {recipe.image_url ? (
                            <RecipeImage
                              imageUrl={recipe.image_url}
                              alt={recipe.nom}
                              className="w-full h-full"
                              fallbackClassName="rounded-2xl"
                              priority={false}
                              sizes="(max-width: 768px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] flex items-center justify-center rounded-2xl">
                              <span className="text-4xl">🍽️</span>
                            </div>
                          )}
                          {/* Badge favori en overlay */}
                          <button
                            className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm transition-all ${
                              isFavorite(recipe.id)
                                ? "bg-[#C03A3A]/90 text-white"
                                : "bg-white/80 text-[#7A3A3A] hover:bg-white"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(recipe);
                            }}
                            aria-label={
                              isFavorite(recipe.id)
                                ? "Retirer des favoris"
                                : "Ajouter aux favoris"
                            }
                          >
                            {isFavorite(recipe.id) ? "★" : "☆"}
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
                        
                        {/* Nom de la recette en dessous */}
                        <h4 className="font-semibold text-sm text-[#6B2E2E] text-center leading-tight px-1 line-clamp-2">
                          {recipe.nom}
                        </h4>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
      )}

      {/* Modal de notation */}
      {showRatingModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#6B2E2E]">Noter cette recette</h3>
              <button
                className="text-[#7A3A3A] hover:text-[#6B2E2E]"
                onClick={() => setShowRatingModal(false)}
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-[#7A3A3A] mb-6">{selectedRecipe.nom}</p>
            
            {/* Sélection de note avec étoiles */}
            <div className="mb-6">
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`text-4xl transition-transform hover:scale-110 ${
                      userRating >= star ? "text-yellow-400" : "text-gray-300"
                    }`}
                    onClick={() => setUserRating(star)}
                    aria-label={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {userRating > 0 && (
                <p className="text-center text-sm text-[#7A3A3A]">
                  Tu as sélectionné {userRating} étoile{userRating > 1 ? "s" : ""}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 rounded-xl bg-white border-2 border-[#E8A0A0] text-sm font-semibold text-[#6B2E2E] hover:border-[#D44A4A] transition-colors"
                onClick={() => setShowRatingModal(false)}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] text-sm font-semibold text-white hover:from-[#C03A3A] hover:to-[#6B5F3F] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (userRating > 0) {
                    saveRating(selectedRecipe.id, userRating);
                    setShowRatingModal(false);
                    setUserRating(0);
                  }
                }}
                disabled={userRating === 0}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de collection pour ajouter une recette */}
      {showCollectionModal && recipeToAddToCollection && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFF0F0] rounded-2xl p-6 shadow-xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#6B2E2E]">
                Ajouter à une collection
              </h3>
              <button
                onClick={() => {
                  setShowCollectionModal(false);
                  setRecipeToAddToCollection(null);
                }}
                className="text-[var(--text-muted)] hover:text-[#6B2E2E]"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-[#7A3A3A] mb-4">{recipeToAddToCollection.nom}</p>
            <div className="space-y-2 mb-4">
              {collections.length === 0 ? (
                <p className="text-sm text-[#7A3A3A] text-center mb-4 py-4">
                  Aucune collection. Crée-en une d'abord dans "Mon carnet" !
                </p>
              ) : (
                collections.map((collection) => {
                  const isInCollection = collection.recipeIds.includes(recipeToAddToCollection.id);
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
                          handleRemoveFromCollection(collection.id, recipeToAddToCollection.id);
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
                })
              )}
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--beige-card-alt)] border border-[var(--beige-border)] text-sm text-[var(--text-primary)] font-semibold hover:border-[var(--beige-accent)] transition-colors"
                onClick={async () => {
                  setShowCollectionModal(false);
                  setRecipeToAddToCollection(null);
                  // Recharger les favoris au cas où une recette a été ajoutée
                  const updated = await loadFavorites();
                  setFavorites(updated);
                }}
              >
                Passer
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] text-sm font-semibold text-white hover:from-[#C03A3A] hover:to-[#D44A4A] transition-all shadow-md"
                onClick={async () => {
                  setShowCollectionModal(false);
                  setRecipeToAddToCollection(null);
                  // Recharger les favoris au cas où une recette a été ajoutée
                  const updated = await loadFavorites();
                  setFavorites(updated);
                }}
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
