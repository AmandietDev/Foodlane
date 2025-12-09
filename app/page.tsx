"use client";

import { useEffect, useState } from "react";
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


export default function Home() {
  const { t } = useTranslation();
  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [results, setResults] = useState<Recipe[]>([]);
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
      loadPopularRecipes();
    };
    
    loadData();
    
    // Écouter les changements de favoris depuis d'autres pages
    const handleFavoritesUpdated = async () => {
      const updated = await loadFavorites();
      // Favoris mis à jour depuis un autre composant
      setFavorites(updated);
    };
    
    window.addEventListener("favoritesUpdated", handleFavoritesUpdated);
    
    return () => {
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdated);
    };
  }, []);

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
      
      // Mélange aléatoire amélioré (Fisher-Yates shuffle) pour les recettes du moment
      const shuffled = [...seasonalRecipes];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Prendre 4 recettes aléatoires de saison pour l'affichage sur la page d'accueil
      const selectedRecipes = shuffled.slice(0, 4);
      // Recettes du moment sélectionnées
      
      setPopularRecipes(selectedRecipes);
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

  // Fonction pour gérer la touche Espace dans le champ de saisie
  const handleIngredientInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (currentIngredientInput.trim()) {
        handleAddIngredient(currentIngredientInput);
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
      // Début de la génération avec ingrédients
      
      const res = await fetch("/api/recipes", {
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
      const recipes: Recipe[] = data.recipes || [];

      // Recettes récupérées depuis l'API

      if (recipes.length === 0) {
        console.warn("[Generate] ⚠️ Aucune recette récupérée depuis l'API");
        setGenerateError("Aucune recette disponible. Vérifiez la configuration de la base de données.");
        setResults([]);
        setShowResultsPanel(true);
        setLoadingGenerate(false);
        return;
      }

      // Fonction pour normaliser le texte (enlever accents, espaces, etc.)
      const normalizeText = (text: string): string => {
        return text
          .toLowerCase()
          .normalize("NFD") // Décompose les caractères accentués
          .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
          .replace(/[^\w\s]/g, " ") // Remplace les caractères spéciaux par des espaces
          .replace(/\s+/g, " ") // Normalise les espaces
          .trim();
      };

      // Utiliser la liste d'ingrédients sélectionnés (déjà en minuscules)
      // Si aucun ingrédient n'est renseigné, on génère juste les recettes du type sélectionné
      const hasIngredients = selectedIngredients.length > 0;
      const searchTerms = hasIngredients
        ? selectedIngredients
            .map(term => normalizeText(term)) // Normaliser chaque terme
        : [];
      
      console.log("[Generate] Termes de recherche normalisés:", searchTerms);
      console.log("[Generate] Nombre total de recettes récupérées:", recipes.length);
      console.log("[Generate] Ingrédients renseignés:", hasIngredients ? "Oui" : "Non - génération par type uniquement");
      
      // Afficher quelques exemples de recettes pour vérifier qu'elles sont bien chargées
      if (recipes.length > 0) {
        console.log("[Generate] Exemples de recettes chargées:");
        recipes.slice(0, 2).forEach(r => {
          console.log(`  - "${r.nom}" (Type: ${r.type})`);
          console.log(`    Ingrédients: "${(r.ingredients || "").substring(0, 100)}..."`);
        });
      }

      // SIMPLIFICATION: On ne filtre QUE par les ingrédients recherchés et le type (sucré/salé)
      // Pas de filtre par régimes, allergies, équipements ou saison
      // L'objectif est simple: trouver les recettes qui contiennent les ingrédients recherchés
      console.log(`[Generate] Recherche SIMPLIFIÉE: uniquement par ingrédients et type (pas de filtres régimes/allergies/équipements/saison)`);

      // Filtrer par type (sucré/salé) si sélectionné
      let filteredRecipes = recipes;
      if (recipeTypeFilter !== "all") {
        filteredRecipes = recipes.filter(recipe => {
          const type = (recipe.type || "").toLowerCase().trim();
          if (recipeTypeFilter === "sweet") {
            // Rechercher "sucré", "sucree", "sucr", etc.
            return type.includes("sucré") || type.includes("sucree") || type.includes("sucr");
          } else if (recipeTypeFilter === "savory") {
            // Rechercher "salé", "sale", "sal", etc.
            return type.includes("salé") || type.includes("sale") || type.includes("sal");
          }
          return true;
        });
        console.log(`[Generate] ${filteredRecipes.length} recettes après filtrage par type "${recipeTypeFilter}" (sur ${recipes.length})`);
      } else {
        console.log(`[Generate] ${filteredRecipes.length} recettes disponibles pour recherche par ingrédients (tous types)`);
      }

      // Afficher quelques exemples de recettes pour déboguer
      if (filteredRecipes.length > 0) {
        const sampleRecipes = filteredRecipes.slice(0, 3);
        console.log("[Generate] Exemples de recettes filtrées:");
        sampleRecipes.forEach(r => {
          const ingredientsPreview = (r.ingredients || "").substring(0, 100);
          console.log(`  - "${r.nom}" (${r.type}): "${ingredientsPreview}..."`);
        });
      }

      // Si aucun ingrédient n'est renseigné, afficher simplement les recettes du type sélectionné
      if (!hasIngredients && filteredRecipes.length > 0) {
        console.log(`[Generate] Aucun ingrédient renseigné - affichage de ${filteredRecipes.length} recettes du type "${recipeTypeFilter}"`);
        
        // Mélanger les recettes pour avoir une sélection variée
        const shuffled = [...filteredRecipes];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Prendre 6-8 recettes aléatoires
        const bestRecipes = shuffled.slice(0, 8);
        console.log(`[Generate] ✅ ${bestRecipes.length} recettes sélectionnées (par type uniquement)`);
        
        setResults(bestRecipes);
        setShowResultsPanel(true);
        setGenerateError(null);
        setLoadingGenerate(false);
        return;
      }

      // Calculer un score pour chaque recette basé sur les ingrédients recherchés
      // IMPORTANT: Les ingrédients sont stockés avec quantités séparés par ; (ex: "100 g beurre; 50 g compote")
      // On doit chercher dans chaque ingrédient individuellement pour mieux matcher
      const scored = filteredRecipes
        .map((recipe) => {
          // Séparer les ingrédients (séparés par ;) et normaliser
          const ingredientsList = (recipe.ingredients || "")
            .split(";")
            .map(ing => normalizeText(ing.trim()))
            .filter(ing => ing.length > 0);
          
          // Aussi garder le texte complet normalisé pour recherche globale
          const ingredientsText = normalizeText(recipe.ingredients || "");
          
          let score = 0;
          const matchedTerms: string[] = [];

          // Compter combien d'ingrédients recherchés sont trouvés dans la recette
          let matchedIngredientsCount = 0;
          const totalSearchTerms = searchTerms.length;
          
          searchTerms.forEach((term) => {
            let found = false;
            const originalTerm = term; // Garder le terme original pour les logs
            
            // 1. Recherche dans le texte complet normalisé
            if (ingredientsText.includes(term)) {
              found = true;
    } else {
              // 2. Chercher dans chaque ingrédient individuellement
              for (const ingredient of ingredientsList) {
                // Extraire le nom de l'ingrédient (sans quantité)
                // Format typique: "100 g beurre" -> on cherche dans "beurre"
                // Ou: "2 cuillères à soupe d'huile" -> on cherche dans "huile"
                const ingredientParts = ingredient.split(/\s+/);
                let ingredientName = ingredient;
                
                // Si l'ingrédient commence par un nombre ou une unité, extraire le nom
                if (ingredientParts.length > 1) {
                  // Chercher à partir du premier mot qui n'est pas un nombre ou une unité
                  const units = ['g', 'kg', 'ml', 'l', 'cl', 'dl', 'cuillere', 'cuilleres', 'tasse', 'tasses', 'pincee', 'pincées', 'pincees', 'soupe', 'cafe', 'the'];
                  let startIdx = 0;
                  for (let i = 0; i < ingredientParts.length; i++) {
                    const part = ingredientParts[i];
                    // Si c'est un nombre ou une unité, continuer
                    if (/^\d+([.,]\d+)?$/.test(part) || units.some(u => part.includes(u)) || part === 'd' || part === "de" || part === "d'") {
                      startIdx = i + 1;
                    } else {
                      break;
                    }
                  }
                  if (startIdx < ingredientParts.length) {
                    ingredientName = ingredientParts.slice(startIdx).join(" ");
                  }
                }
                
                // Normaliser le nom de l'ingrédient
                const normalizedIngredientName = normalizeText(ingredientName);
                const normalizedIngredient = normalizeText(ingredient);
                
                // Recherche exacte du terme dans le nom de l'ingrédient (normalisé)
                if (normalizedIngredientName.includes(term) || normalizedIngredient.includes(term)) {
                  found = true;
                  break; // Sortir de la boucle dès qu'on trouve
                }
                
                // Recherche par mot avec pluriel et variations
                // IMPORTANT: Pour éviter les confusions (pommes vs pommes de terre, poire vs poireaux)
                // On cherche d'abord le terme complet, puis les mots individuels
                const termWords = term.split(/\s+/).filter(w => w.length > 0);
                
                // 1. Chercher le terme complet d'abord (pour "pommes de terre", "poireaux", etc.)
                if (termWords.length > 1) {
                  // Terme composé : chercher le terme complet avec word boundaries pour plus de précision
                  const fullTermPattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                  if (fullTermPattern.test(normalizedIngredientName) || fullTermPattern.test(normalizedIngredient)) {
                    found = true;
                    break;
                  }
                }
                
                // 2. Chercher chaque mot individuellement (pour les termes simples)
                for (const word of termWords) {
                  if (word.length >= 2) {
                    // Pour les mots courts ou simples, chercher avec word boundaries pour éviter les confusions
                    // Ex: "poire" ne doit pas matcher "poireaux"
                    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    
                    // Si c'est un mot simple (1 mot), utiliser word boundary strict
                    if (termWords.length === 1) {
                      // Recherche avec word boundary pour éviter les confusions
                      // Ex: "poire" ne matchera pas "poireaux", "pommes" ne matchera pas "pommes de terre"
                      const wordPattern = new RegExp(`\\b${escapedWord}(s|x|aux)?(?!\\w)`, 'i');
                      if (wordPattern.test(normalizedIngredientName) || wordPattern.test(normalizedIngredient)) {
                        found = true;
                        break;
                      }
                    } else {
                      // Pour les mots dans un terme composé, recherche plus flexible
                      const wordPattern = new RegExp(`\\b${escapedWord}(s|x|aux)?\\b`, 'i');
                      if (wordPattern.test(normalizedIngredientName) || wordPattern.test(normalizedIngredient)) {
                        found = true;
                        break;
                      }
                    }
                    
                    // Fallback: recherche simple mais avec vérification pour éviter les confusions
                    // Ex: "pommes" ne doit pas matcher "pommes de terre" si on cherche juste "pommes"
                    const simpleMatch = normalizedIngredientName.includes(word) || normalizedIngredient.includes(word);
                    if (simpleMatch) {
                      // Vérifier que ce n'est pas un préfixe d'un mot composé
                      // Ex: "pommes" dans "pommes de terre" -> ne pas matcher si on cherche juste "pommes"
                      // Mais "pommes" dans "pommes" -> matcher
                      const wordEndCheck = new RegExp(`\\b${escapedWord}(s|x|aux)?(?:\\s|$|[^a-z])`, 'i');
                      if (wordEndCheck.test(normalizedIngredientName) || wordEndCheck.test(normalizedIngredient)) {
                        found = true;
                        break;
                      }
                    }
                  }
                }
                
                if (found) break; // Sortir de la boucle des ingrédients si trouvé
              }
            }
            
            if (found) {
              matchedIngredientsCount++;
              score += 1;
              matchedTerms.push(originalTerm);
            }
          });
          
          // AMÉLIORATION DU SCORING POUR MEILLEURE PERTINENCE :
          // 1. Score de base = nombre d'ingrédients recherchés trouvés
          // 2. Bonus si plusieurs ingrédients sont trouvés (favorise les recettes complètes)
          // 3. BONUS MAJEUR si TOUS les ingrédients recherchés sont trouvés (recette parfaite)
          
          if (matchedIngredientsCount > 1) {
            // Bonus progressif : plus on trouve d'ingrédients, plus le bonus est élevé
            score += matchedIngredientsCount * 0.5;
          }
          
          // Bonus majeur si TOUS les ingrédients recherchés sont trouvés
          if (matchedIngredientsCount === totalSearchTerms && totalSearchTerms > 1) {
            score += 5; // Bonus important pour les recettes qui contiennent TOUS les ingrédients
          }
          
          // Score final = pertinence de la recette
          // Plus le score est élevé, plus la recette est pertinente

          // Log détaillé pour les premières recettes qui matchent
          if (score > 0) {
            console.log(`[Generate] ✅ "${recipe.nom}" - Score: ${score}, Termes: ${matchedTerms.join(", ")}, Ingrédients: "${ingredientsText.substring(0, 80)}..."`);
          }

          return { recipe, score, matchedTerms };
        })
        // Filtrer SEULEMENT les recettes avec score > 0 (qui contiennent au moins un ingrédient recherché)
        .filter((item) => item.score > 0)
        // TRI PAR PERTINENCE : les plus pertinentes en premier
        .sort((a, b) => {
          // 1. Trier par score décroissant (les plus pertinentes en premier)
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          
          // 2. Si même score, trier par nombre d'ingrédients trouvés (plus = mieux)
          const aMatched = a.matchedTerms.length;
          const bMatched = b.matchedTerms.length;
          if (bMatched !== aMatched) {
            return bMatched - aMatched;
          }
          
          // 3. Si toujours égal, trier par ordre alphabétique (stable et prévisible)
          return a.recipe.nom.localeCompare(b.recipe.nom);
        });
      
      console.log(`[Generate] ${scored.length} recettes avec score > 0 (contiennent au moins un ingrédient recherché)`);
      
      // Afficher SEULEMENT les recettes qui ont un score > 0 (qui contiennent vraiment les ingrédients)
      let bestRecipes: Recipe[];
      if (scored.length > 0) {
        // Prendre les meilleures recettes (jusqu'à 8)
        bestRecipes = scored
          .slice(0, 8)
          .map(item => item.recipe);
        
        console.log(`[Generate] Top ${bestRecipes.length} recettes sélectionnées (par score):`);
        scored.slice(0, Math.min(5, bestRecipes.length)).forEach((item, idx) => {
          console.log(`  ${idx + 1}. "${item.recipe.nom}" - Score: ${item.score.toFixed(1)}, Termes: ${item.matchedTerms.join(", ")}`);
        });
      } else {
        // AUCUNE recette ne contient les ingrédients recherchés
        console.warn("[Generate] ⚠️ Aucune recette ne contient les ingrédients recherchés");
        bestRecipes = [];
        setGenerateError(`Aucune recette ne contient "${selectedIngredients.join(", ")}". Essayez avec d'autres ingrédients.`);
      }
      
      // Si aucune recette n'a de score, afficher plus de détails
      if (scored.length === 0 && filteredRecipes.length > 0) {
        console.warn("[Generate] ⚠️ Aucune recette ne correspond - Analyse détaillée:");
        const firstRecipe = filteredRecipes[0];
        console.log(`[Generate] Exemple de recette: "${firstRecipe.nom}"`);
        console.log(`[Generate] Ingrédients (texte complet): "${firstRecipe.ingredients}"`);
        console.log(`[Generate] Ingrédients (lowercase): "${(firstRecipe.ingredients || "").toLowerCase()}"`);
        console.log(`[Generate] Termes recherchés:`, searchTerms);
        searchTerms.forEach(term => {
          const ingredientsLower = (firstRecipe.ingredients || "").toLowerCase();
          const found = ingredientsLower.includes(term);
          console.log(`[Generate]   - "${term}" trouvé dans texte complet: ${found}`);
          
          // Tester aussi dans chaque ingrédient séparément
          const ingredientsList = ingredientsLower.split(";").map(i => i.trim());
          ingredientsList.forEach((ing, idx) => {
            if (ing.includes(term)) {
              console.log(`[Generate]     - Trouvé dans ingrédient ${idx + 1}: "${ing}"`);
            }
          });
          
          if (!found && term.length >= 3) {
            // Tester avec pluriel
            const withS = term + "s";
            const foundWithS = ingredientsLower.includes(withS);
            console.log(`[Generate]     - "${withS}" (pluriel) trouvé: ${foundWithS}`);
          }
        });
        
        // Afficher tous les ingrédients uniques de quelques recettes pour aider
        const allIngredients = new Set<string>();
        filteredRecipes.slice(0, 5).forEach(r => {
          const ingList = (r.ingredients || "").split(";").map(i => {
            // Extraire juste le nom de l'ingrédient (sans quantité)
            const parts = i.trim().split(/\s+/);
            if (parts.length > 1) {
              // Enlever la quantité (premier mot) et garder le reste
              return parts.slice(1).join(" ").toLowerCase();
            }
            return i.trim().toLowerCase();
          });
          ingList.forEach(ing => {
            if (ing.length > 2) allIngredients.add(ing);
          });
        });
        console.log("[Generate] Exemples d'ingrédients disponibles dans les recettes:", Array.from(allIngredients).slice(0, 20));
      }

      console.log(`[Generate] ${scored.length} recettes avec au moins un ingrédient correspondant`);
      
      if (scored.length > 0) {
        console.log("[Generate] Top 3 recettes:", scored.slice(0, 3).map(s => ({
          nom: s.recipe.nom,
          score: s.score,
          termes: s.matchedTerms
        })));
      } else {
        console.warn("[Generate] ⚠️ Aucune recette ne correspond aux ingrédients recherchés");
        // Afficher quelques exemples d'ingrédients disponibles pour aider l'utilisateur
        const sampleIngredients = filteredRecipes.slice(0, 3).map(r => {
          const ing = (r.ingredients || "").split(";").slice(0, 3).join(", ");
          return `${r.nom}: ${ing}`;
        });
        console.log("[Generate] Exemples d'ingrédients dans les recettes:", sampleIngredients);
        setGenerateError(`Aucune recette ne correspond à "${selectedIngredients.join(", ")}". Essayez avec d'autres ingrédients ou vérifiez l'orthographe.`);
      }

      console.log(`[Generate] ✅ ${bestRecipes.length} recettes sélectionnées pour affichage`);

      if (bestRecipes.length === 0) {
        // L'erreur est déjà définie plus haut si aucune recette n'a de score > 0
        if (!generateError) {
          setGenerateError(`Aucune recette ne correspond à "${selectedIngredients.join(", ")}". Essayez avec d'autres ingrédients.`);
        }
      } else {
        setGenerateError(null); // Effacer l'erreur si on a des résultats
      }

      // IMPORTANT: Ne pas modifier popularRecipes ici - c'est complètement indépendant
      // On utilise setResults pour les recettes générées par ingrédients
      setResults(bestRecipes);
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
      
      // Ensuite, ouvrir le modal de sélection de collection (optionnel)
      setRecipeToAddToCollection(recipe);
      setShowCollectionModal(true);
      // Recharger les collections pour avoir les dernières données
      const updatedCollections = await loadCollections();
      setCollections(updatedCollections);
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
          <input
            type="text"
            className="w-full rounded-xl bg-white border border-[var(--beige-border)] px-4 py-3 pl-12 text-sm outline-none focus:border-[#D44A4A] text-[#6B2E2E] placeholder:text-[var(--text-muted)]"
            placeholder="Tapez un ingrédient et appuyez sur Espace..."
            value={currentIngredientInput}
            onChange={(e) => setCurrentIngredientInput(e.target.value)}
            onKeyDown={handleIngredientInputKeyDown}
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A3A3A] text-lg">🔍</span>
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
                    
                    // Mélange aléatoire (Fisher-Yates)
                    const shuffled = [...seasonalRecipes];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    
                    // Prendre environ 10 recettes
                    const allPopularRecipes = shuffled.slice(0, 10);
                    setResults(allPopularRecipes);
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
              {results.length === 0 && (
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
