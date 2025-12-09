"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../src/lib/supabaseClient";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Recipe } from "../src/lib/recipes";
import {
  type WeeklyMenu,
  type WeeklyMenuDay,
  type MealType,
  createEmptyWeeklyMenu,
  saveWeeklyMenu,
  getCurrentWeekMenu,
  getAllWeeklyMenus,
  formatDate,
  formatDateDisplay,
  getMondayOfWeek,
} from "../src/lib/weeklyMenu";
import {
  generateSmartShoppingList,
  formatShoppingListItem,
  filterMissingItems,
  type ShoppingListItem,
} from "../src/lib/shoppingList";
import { loadPreferences } from "../src/lib/userPreferences";
import RecipeImage from "../components/RecipeImage";
import {
  detectDietaryBadges,
  DIETARY_BADGE_ICONS,
  filterRecipesByDietaryProfile,
  filterRecipesByEquipment,
  type DietaryProfile,
} from "../src/lib/dietaryProfiles";
import { filterRecipesBySeason } from "../src/lib/seasonalFilter";
import { analyzeMenu, type MenuAdvice } from "../src/lib/menuAnalysis";
import CameraCapture from "../components/CameraCapture";

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: "petit-dejeuner", label: "Petit-déjeuner", icon: "🌅" },
  { key: "dejeuner", label: "Déjeuner", icon: "☀️" },
  { key: "diner", label: "Dîner", icon: "🌙" },
  { key: "collation", label: "Collation", icon: "🍎" },
];

export default function WeeklyMenuPage() {
  const router = useRouter();
  const [menu, setMenu] = useState<WeeklyMenu | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showCalories, setShowCalories] = useState(true);
  const [viewMode, setViewMode] = useState<"edit" | "view">("edit");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<{ day: string; mealType: MealType } | null>(null);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [recipeSearchTerm, setRecipeSearchTerm] = useState("");
  const [recipeFilters, setRecipeFilters] = useState({
    type: "tous" as "tous" | "sucré" | "salé",
    difficulte: "tous" as "tous" | "Facile" | "Moyen" | "Difficile",
    tempsMax: "" as string,
  });
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeToAddToMenu, setRecipeToAddToMenu] = useState<Recipe | null>(null);
  const [showMealSelectionModal, setShowMealSelectionModal] = useState(false);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [menuAdvice, setMenuAdvice] = useState<MenuAdvice[]>([]);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [shoppingListData, setShoppingListData] = useState<ShoppingListItem[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [finalShoppingList, setFinalShoppingList] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showMealAnalysis, setShowMealAnalysis] = useState(false);
  const [mealAnalysis, setMealAnalysis] = useState<any>(null);
  const [analyzingMeal, setAnalyzingMeal] = useState(false);
  const [capturedMealImage, setCapturedMealImage] = useState<string | null>(null);
  const [showCameraForAdvice, setShowCameraForAdvice] = useState(false);
  const [showAdviceWithPhoto, setShowAdviceWithPhoto] = useState(false);
  const [adviceMealAnalysis, setAdviceMealAnalysis] = useState<any>(null);
  const [analyzingAdviceMeal, setAnalyzingAdviceMeal] = useState(false);
  const [capturedAdviceImage, setCapturedAdviceImage] = useState<string | null>(null);
  // Vérifier la session avec le hook réutilisable
  const { user, loading: sessionLoading } = useSupabaseSession();

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/login");
    }
  }, [user, sessionLoading, router]);

  useEffect(() => {
    if (sessionLoading || !user) return; // Attendre la vérification d'authentification
    
    const preferences = loadPreferences();
    setIsPremium(preferences.abonnementType === "premium");
    setShowCalories(preferences.afficherCalories);

    // Charger le menu actuel ou créer un nouveau
    const currentMenu = getCurrentWeekMenu();
    if (currentMenu) {
      setMenu(currentMenu);
      setViewMode("view");
    } else {
      // Créer un nouveau menu vide (l'utilisateur ajoutera les jours qu'il veut)
      const newMenu = createEmptyWeeklyMenu();
      setMenu(newMenu);
      setViewMode("edit");
    }
  }, []);

  // Vérifier si une recette a été passée depuis une autre page
  // Ce useEffect doit s'exécuter APRÈS que le menu soit chargé
  useEffect(() => {
    if (!menu) return; // Attendre que le menu soit chargé

    if (typeof window !== "undefined") {
      // Vérifier si on doit ouvrir la liste de courses (vérifier après que availableRecipes soit chargé)
      // Cette vérification sera faite dans un autre useEffect après le chargement des recettes

      const recipeToAddStr = localStorage.getItem("foodlane_recipe_to_add");
      if (recipeToAddStr) {
        try {
          const recipeToAdd: Recipe = JSON.parse(recipeToAddStr);
          // Supprimer la clé du localStorage
          localStorage.removeItem("foodlane_recipe_to_add");
          
          // Ouvrir le modal de sélection de repas avec la recette pré-sélectionnée
          setRecipeToAddToMenu(recipeToAdd);
          setShowMealSelectionModal(true);
          
          // Passer en mode édition pour que l'utilisateur puisse voir et modifier le menu
          setViewMode("edit");
        } catch (err) {
          console.error("Erreur lors du chargement de la recette à ajouter :", err);
        }
      }
    }
  }, [menu]); // S'exécute quand le menu est chargé

  // Vérifier si on doit ouvrir la liste de courses après que le menu et les recettes soient chargés
  useEffect(() => {
    if (!menu || availableRecipes.length === 0) return;

    if (typeof window !== "undefined") {
      const showShoppingList = localStorage.getItem("foodlane_show_shopping_list");
      if (showShoppingList === "true") {
        localStorage.removeItem("foodlane_show_shopping_list");
        // Générer la liste de courses et ouvrir le modal
        const shoppingList = generateSmartShoppingList(menu, availableRecipes);
        if (shoppingList.length === 0) {
          alert("Aucun ingrédient à ajouter à la liste de courses.");
        } else {
          setShoppingListData(shoppingList);
          setShowShoppingListModal(true);
        }
      }
    }
  }, [menu, availableRecipes]);

  // Charger les recettes disponibles
  useEffect(() => {
    async function loadRecipes() {
      try {
        const res = await fetch("/api/recipes");
        if (res.ok) {
          const data = await res.json();
          setAvailableRecipes(data.recipes || []);
          setFilteredRecipes(data.recipes || []);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des recettes :", err);
      }
    }
    loadRecipes();
  }, []);

  // Filtrer les recettes selon la recherche et les filtres
  useEffect(() => {
    let filtered = [...availableRecipes];

    // Charger les préférences utilisateur pour le filtrage automatique
    const userPreferences = loadPreferences();
    const dietaryProfiles = userPreferences.regimesParticuliers as DietaryProfile[];
    const allergies = userPreferences.aversionsAlimentaires;
    const availableEquipment = userPreferences.equipements;

    // Filtre automatique par régimes et allergies (en premier)
    filtered = filterRecipesByDietaryProfile(
      filtered,
      dietaryProfiles,
      allergies
    );

    // Filtre automatique par équipements disponibles
    filtered = filterRecipesByEquipment(filtered, availableEquipment);

    // Filtre automatique par saison (en priorité pour privilégier les recettes de saison)
    filtered = filterRecipesBySeason(filtered);

    // Filtre par recherche textuelle
    if (recipeSearchTerm.trim()) {
      const term = recipeSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (recipe) =>
          recipe.nom.toLowerCase().includes(term) ||
          recipe.description_courte?.toLowerCase().includes(term) ||
          recipe.ingredients.toLowerCase().includes(term)
      );
    }

    // Filtre par type
    if (recipeFilters.type !== "tous") {
      filtered = filtered.filter((recipe) => {
        const recipeTypeLower = recipe.type?.toLowerCase() || "";
        return recipeTypeLower.includes(recipeFilters.type);
      });
    }

    // Filtre par difficulté
    if (recipeFilters.difficulte !== "tous") {
      filtered = filtered.filter((recipe) => {
        const difficulteLower = recipe.difficulte?.toLowerCase() || "";
        return difficulteLower.includes(recipeFilters.difficulte.toLowerCase());
      });
    }

    // Filtre par temps maximum
    if (recipeFilters.tempsMax) {
      const tempsMax = parseInt(recipeFilters.tempsMax);
      if (!isNaN(tempsMax)) {
        filtered = filtered.filter((recipe) => {
          return recipe.temps_preparation_min <= tempsMax;
        });
      }
    }

    setFilteredRecipes(filtered);
  }, [recipeSearchTerm, recipeFilters, availableRecipes]);

  const handleSelectRecipe = (recipe: Recipe) => {
    if (!menu || !selectedMeal) return;

    const updatedDays = menu.days.map((day) => {
      if (day.date === selectedMeal.day) {
        const updatedMeals = { ...day.meals };
        const meal = updatedMeals[selectedMeal.mealType];
        
        if (meal) {
          // Ajouter la recette à la liste des recettes du repas (éviter les doublons)
          const existingRecipes = meal.recipes || [];
          const recipeExists = existingRecipes.some(r => r.id === recipe.id);
          if (!recipeExists) {
            updatedMeals[selectedMeal.mealType] = {
              ...meal,
              recipes: [...existingRecipes, recipe],
            };
          }
        } else if (selectedMeal.mealType === "collation") {
          updatedMeals.collation = { recipes: [recipe], mealType: "collation" };
        } else {
          updatedMeals[selectedMeal.mealType] = { recipes: [recipe], mealType: selectedMeal.mealType };
        }
        
        return { ...day, meals: updatedMeals };
      }
      return day;
    });

    const updatedMenu: WeeklyMenu = {
      ...menu,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    };

    setMenu(updatedMenu);
    setSelectedMeal(null);
  };

  const handleAddRecipeToMeal = (day: string, mealType: MealType) => {
    if (!menu || !recipeToAddToMenu) return;

    const updatedDays = menu.days.map((d) => {
      if (d.date === day) {
        const updatedMeals = { ...d.meals };
        const meal = updatedMeals[mealType];
        
        if (meal) {
          // Ajouter la recette à la liste des recettes du repas (éviter les doublons)
          const existingRecipes = meal.recipes || [];
          const recipeExists = existingRecipes.some(r => r.id === recipeToAddToMenu.id);
          if (!recipeExists) {
            updatedMeals[mealType] = {
              ...meal,
              recipes: [...existingRecipes, recipeToAddToMenu],
            };
          }
        } else if (mealType === "collation") {
          updatedMeals.collation = { recipes: [recipeToAddToMenu], mealType: "collation" };
        } else {
          updatedMeals[mealType] = { recipes: [recipeToAddToMenu], mealType };
        }
        
        return { ...d, meals: updatedMeals };
      }
      return d;
    });

    const updatedMenu: WeeklyMenu = {
      ...menu,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    };

    setMenu(updatedMenu);
    setRecipeToAddToMenu(null);
    setShowMealSelectionModal(false);
    setViewMode("edit");
  };

  const handleSaveMenu = () => {
    if (!menu) return;
    saveWeeklyMenu(menu);
    setViewMode("view");
    alert("Menu sauvegardé avec succès !");
  };

  const handleGenerateShoppingList = () => {
    if (!isPremium) {
      router.push("/premium");
      return;
    }

    if (!menu) return;

    const shoppingList = generateSmartShoppingList(menu, availableRecipes);
    if (shoppingList.length === 0) {
      alert("Aucun ingrédient à ajouter à la liste de courses.");
      return;
    }

    // Ouvrir le modal de sélection (cocher ce qu'on a déjà)
    setShoppingListData(shoppingList);
    setShowShoppingListModal(true);
  };

  const handleGetDietitianAdvice = () => {
    if (!menu) return;

    // Analyser le menu et générer des conseils
    const advice = analyzeMenu(menu, availableRecipes);
    setMenuAdvice(advice);
    setShowAdviceModal(true);
  };

  const handleCaptureAdvicePhoto = async (imageDataUrl: string) => {
    setCapturedAdviceImage(imageDataUrl);
    setShowCameraForAdvice(false);
    setAnalyzingAdviceMeal(true);
    setShowAdviceWithPhoto(true);

    try {
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64: imageDataUrl }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'analyse");
      }

      const analysis = await response.json();
      setAdviceMealAnalysis(analysis);
    } catch (error) {
      console.error("Erreur lors de l'analyse du repas:", error);
      setAdviceMealAnalysis({
        error: "Impossible d'analyser le repas pour le moment. Réessaie plus tard.",
      });
    } finally {
      setAnalyzingAdviceMeal(false);
    }
  };

  const handleCaptureMealPhoto = async (imageDataUrl: string) => {
    setCapturedMealImage(imageDataUrl);
    setShowCamera(false);
    setAnalyzingMeal(true);
    setShowMealAnalysis(true);

    try {
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64: imageDataUrl }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'analyse");
      }

      const analysis = await response.json();
      setMealAnalysis(analysis);
    } catch (error) {
      console.error("Erreur lors de l'analyse du repas:", error);
      setMealAnalysis({
        error: "Impossible d'analyser le repas pour le moment. Réessaie plus tard.",
      });
    } finally {
      setAnalyzingMeal(false);
    }
  };

  const handleToggleItem = (index: number) => {
    const updated = [...shoppingListData];
    updated[index].hasAtHome = !updated[index].hasAtHome;
    setShoppingListData(updated);
  };

  const handleValidateShoppingList = () => {
    // Filtrer pour ne garder que ce qui manque
    const missingItems = filterMissingItems(shoppingListData);
    if (missingItems.length === 0) {
      alert("Tu as déjà tous les ingrédients ! 🎉");
      setShowShoppingListModal(false);
      return;
    }

    // Convertir en format texte pour l'export
    const textList = missingItems.map((item) => formatShoppingListItem(item));
    setFinalShoppingList(textList);
    setShowShoppingListModal(false);
    setShowExportModal(true);
  };

  const handleExportAsText = () => {
    const text = finalShoppingList.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liste-courses-${formatDate(new Date())}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleExportAsImage = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 50 + finalShoppingList.length * 30;

    ctx.fillStyle = "#FFF0F0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#6B2E2E";
    ctx.font = "bold 20px Arial";
    ctx.fillText("Liste de courses", 20, 30);

    ctx.font = "14px Arial";
    finalShoppingList.forEach((item, index) => {
      ctx.fillText(`• ${item}`, 20, 60 + index * 30);
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `liste-courses-${formatDate(new Date())}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    });
  };

  const handleCopyToClipboard = () => {
    const text = finalShoppingList.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert("Liste de courses copiée dans le presse-papiers !");
      setShowExportModal(false);
    });
  };

  // Afficher un écran de chargement pendant la vérification d'authentification
  if (sessionLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Vérification de la connexion..." />
      </div>
    );
  }

  if (!menu) {
    return (
      <main className="max-w-md mx-auto px-4 pt-6 pb-24">
        <p className="text-center">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Menu de la semaine</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === "edit" ? "view" : "edit")}
              className="px-3 py-1 rounded-xl bg-[#FFD9D9] border border-[#E8A0A0] text-xs text-[var(--text-primary)]"
            >
              {viewMode === "edit" ? "Voir" : "Modifier"}
            </button>
            {viewMode === "edit" && (
              <button
                onClick={handleSaveMenu}
                className="px-3 py-1 rounded-xl bg-[#D44A4A] text-white text-xs"
              >
                Enregistrer
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Ajoute les recettes que tu veux, quand tu veux
        </p>
      </header>

      {/* Menu de la semaine - Affichage simplifié : seulement les jours */}
      <div className="space-y-3 mb-6">
        {menu.days.map((day) => {
          // Compter le nombre total de recettes pour ce jour (toutes les recettes de tous les repas)
          const recipeCount = Object.values(day.meals).reduce((total, meal) => {
            if (meal && meal.recipes) {
              return total + meal.recipes.length;
            }
            return total;
          }, 0);

          // En mode vue, ne montrer que les jours qui ont au moins un repas
          if (viewMode === "view" && recipeCount === 0) return null;

          return (
            <div
              key={day.date}
              className="rounded-2xl bg-[#FFD9D9] border border-[#E8A0A0] p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                // En mode édition, ouvrir le modal pour choisir le jour et le repas
                if (viewMode === "edit") {
                  setSelectedDay(day.date);
                  // Ouvrir directement un modal pour choisir quel repas ajouter/modifier
                }
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-[var(--text-primary)]">
                  {formatDateDisplay(day.date)}
                </h3>
                {recipeCount > 0 && (
                  <span className="text-xs bg-[#D44A4A] text-white px-2 py-1 rounded-full font-semibold">
                    {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
                  </span>
                )}
                {viewMode === "edit" && recipeCount === 0 && (
                  <span className="text-xs text-[var(--text-muted)]">
                    Cliquer pour ajouter
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal pour choisir le jour et le repas en mode édition */}
      {viewMode === "edit" && selectedDay && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF0F0] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                {formatDateDisplay(selectedDay)}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {MEAL_TYPES.filter((mt) => mt.key !== "collation").map((mealType) => {
                const meal = menu?.days.find(d => d.date === selectedDay)?.meals[mealType.key];
                
                return (
                  <div
                    key={mealType.key}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[var(--beige-border)]"
                  >
                    <span className="text-xl">{mealType.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                        {mealType.label}
                      </p>
                      {meal?.recipes && meal.recipes.length > 0 ? (
                        <div className="space-y-2">
                          {meal.recipes.map((recipe, index) => (
                            <div
                              key={recipe.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-[var(--beige-rose)]"
                            >
                              <button
                                onClick={() => {
                                  setSelectedRecipe(recipe);
                                  setSelectedDay(null);
                                }}
                                className="text-xs text-[var(--text-primary)] hover:text-[#D44A4A] text-left flex-1 truncate"
                              >
                                {recipe.nom}
                              </button>
                              <button
                                onClick={() => {
                                  if (menu) {
                                    const updatedDays = menu.days.map((d) => {
                                      if (d.date === selectedDay) {
                                        const updatedMeals = { ...d.meals };
                                        const currentMeal = updatedMeals[mealType.key];
                                        if (currentMeal) {
                                          updatedMeals[mealType.key] = {
                                            ...currentMeal,
                                            recipes: currentMeal.recipes.filter(r => r.id !== recipe.id),
                                          };
                                        }
                                        return { ...d, meals: updatedMeals };
                                      }
                                      return d;
                                    });
                                    setMenu({ ...menu, days: updatedDays });
                                  }
                                }}
                                className="text-[var(--text-muted)] text-xs hover:text-[var(--text-primary)] ml-2 flex-shrink-0"
                                title="Retirer cette recette"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setSelectedMeal({ day: selectedDay, mealType: mealType.key });
                              setSelectedDay(null);
                            }}
                            className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1 text-center border border-dashed border-[var(--beige-border)] rounded-lg hover:border-[#D44A4A] transition-colors"
                          >
                            + Ajouter une autre recette
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedMeal({ day: selectedDay, mealType: mealType.key });
                            setSelectedDay(null);
                          }}
                          className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1 text-center border border-dashed border-[var(--beige-border)] rounded-lg hover:border-[#D44A4A] transition-colors"
                        >
                          + Ajouter une recette
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Boutons actions */}
      {viewMode === "view" && (
        <div className="space-y-3">
          <button
            onClick={handleGetDietitianAdvice}
            className="w-full px-4 py-3 rounded-2xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm"
          >
            💬 Demander l'avis de ma diététicienne
          </button>
          <button
            onClick={handleGenerateShoppingList}
            className={`w-full px-4 py-3 rounded-2xl font-semibold text-sm ${
              isPremium
                ? "bg-[#D44A4A] hover:bg-[#C03A3A] text-white"
                : "bg-[#FFD9D9] border border-[#E8A0A0] text-[var(--text-primary)] opacity-60"
            }`}
          >
            {isPremium ? "🛒 Générer ma liste de courses" : "🛒 Générer ma liste de courses (Premium)"}
          </button>
        </div>
      )}

      {/* Modal de sélection de recette */}
      {selectedMeal && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF0F0] rounded-2xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Choisir une recette</h3>
              <button
                onClick={() => {
                  setSelectedMeal(null);
                  setRecipeSearchTerm("");
                  setRecipeFilters({ type: "tous", difficulte: "tous", tempsMax: "" });
                }}
                className="text-[var(--text-muted)]"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              placeholder="Rechercher une recette..."
              value={recipeSearchTerm}
              onChange={(e) => setRecipeSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-[#FFD9D9] border border-[#E8A0A0] px-3 py-2 text-sm outline-none focus:border-[#B07A6E] text-[var(--text-primary)] mb-3"
            />
            
            {/* Filtres */}
            <div className="mb-4 space-y-3">
              {/* Filtre par type */}
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Type</p>
                <div className="flex gap-2">
                  {(["tous", "sucré", "salé"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setRecipeFilters({ ...recipeFilters, type })}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        recipeFilters.type === type
                          ? "bg-[#D44A4A] text-white border border-[#C03A3A]"
                          : "bg-[#FFD9D9] text-[var(--text-primary)] border border-[#E8A0A0] hover:border-[#D44A4A]"
                      }`}
                    >
                      {type === "tous" ? "Tous" : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre par difficulté */}
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Difficulté</p>
                <div className="flex gap-2">
                  {(["tous", "Facile", "Moyen", "Difficile"] as const).map((difficulte) => (
                    <button
                      key={difficulte}
                      onClick={() => setRecipeFilters({ ...recipeFilters, difficulte })}
                      className={`flex-1 px-2 py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
                        recipeFilters.difficulte === difficulte
                          ? "bg-[#D44A4A] text-white border border-[#C03A3A]"
                          : "bg-[#FFD9D9] text-[var(--text-primary)] border border-[#E8A0A0] hover:border-[#D44A4A]"
                      }`}
                    >
                      {difficulte}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre par temps */}
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Temps max (min)</p>
                <input
                  type="number"
                  placeholder="Ex: 30"
                  value={recipeFilters.tempsMax}
                  onChange={(e) => setRecipeFilters({ ...recipeFilters, tempsMax: e.target.value })}
                  className="w-full rounded-xl bg-[#FFD9D9] border border-[#E8A0A0] px-3 py-2 text-sm outline-none focus:border-[#B07A6E] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredRecipes.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">
                  Aucune recette trouvée
                </p>
              ) : (
                filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  className="w-full text-left p-3 rounded-xl bg-[#FFD9D9] border border-[#E8A0A0] hover:border-[#D44A4A] transition-colors"
                >
                  <p className="font-semibold text-sm text-[var(--text-primary)]">{recipe.nom}</p>
                  {recipe.description_courte && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{recipe.description_courte}</p>
                  )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails de recette */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center">
          <div className="w-full h-full max-w-md bg-[#FFF0F0] border-l border-r border-[#E8A0A0] overflow-y-auto px-4 pt-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{selectedRecipe.nom}</h3>
              <button
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                onClick={() => setSelectedRecipe(null)}
              >
                Fermer ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedRecipe.type && (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                        selectedRecipe.type.toLowerCase().includes("sucré")
                          ? "bg-[#FFD9D9] text-[#D44A4A] border border-[#E8A0A0]"
                          : selectedRecipe.type.toLowerCase().includes("salé")
                          ? "bg-[#FFC4C4] text-[#C03A3A] border border-[#CAAFA0]"
                          : "bg-[#FFD9D9] text-[var(--text-primary)] border border-[#E8A0A0]"
                      }`}>
                        {selectedRecipe.type}
                      </span>
                    )}
                    {detectDietaryBadges(selectedRecipe).map((badge) => (
                      <span
                        key={badge}
                        className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#D44A4A] text-white border border-[#C03A3A] flex items-center gap-1"
                      >
                        <span>{DIETARY_BADGE_ICONS[badge]}</span>
                        <span>{badge}</span>
                      </span>
                    ))}
                    {selectedRecipe.difficulte && (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                        selectedRecipe.difficulte.toLowerCase().includes("facile")
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : selectedRecipe.difficulte.toLowerCase().includes("moyen")
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                          : selectedRecipe.difficulte.toLowerCase().includes("difficile")
                          ? "bg-orange-100 text-orange-700 border border-orange-300"
                          : "bg-[#FFC4C4] text-[var(--text-primary)] border border-[#E8A0A0]"
                      }`}>
                        {selectedRecipe.difficulte}
                      </span>
                    )}
                    {selectedRecipe.temps_preparation_min > 0 && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#FFC4C4] text-[var(--text-primary)] border border-[#E8A0A0]">
                        ⏱ {selectedRecipe.temps_preparation_min} min
                      </span>
                    )}
                    {selectedRecipe.nb_personnes > 0 && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#FFC4C4] text-[var(--text-primary)] border border-[#E8A0A0]">
                        👥 {selectedRecipe.nb_personnes} pers
                      </span>
                    )}
                    {selectedRecipe.calories && showCalories && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#FFC4C4] text-[var(--text-primary)] border border-[#E8A0A0]">
                        🔥 {selectedRecipe.calories} kcal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedRecipe.image_url && (
                <div className="mb-3">
                  <RecipeImage
                    imageUrl={selectedRecipe.image_url}
                    alt={selectedRecipe.nom}
                    className="w-full h-40 rounded-2xl border border-[#B07A6E]"
                    fallbackClassName="rounded-2xl"
                  />
                </div>
              )}

              <p className="text-[var(--text-secondary)]">
                {selectedRecipe.description_courte || "Recette issue de ta base."}
              </p>

              <div>
                <h4 className="font-semibold mb-1">Ingrédients</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {selectedRecipe.ingredients
                    .split(";")
                    .filter((item) => item.trim().length > 0)
                    .map((item, idx) => {
                      const trimmed = item.trim();
                      return (
                        <li key={idx} className="text-[var(--text-secondary)] list-item">
                          {trimmed}
                        </li>
                      );
                    })}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Étapes</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  {selectedRecipe.instructions
                    .split(";")
                    .filter((item) => item.trim().length > 0)
                    .map((item, idx) => {
                      const trimmed = item.trim();
                      return (
                        <li key={idx} className="text-[var(--text-secondary)] list-item">
                          {trimmed}
                        </li>
                      );
                    })}
                </ol>
              </div>

              {selectedRecipe.equipements && (
                <div>
                  <h4 className="font-semibold mb-1">Équipements</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedRecipe.equipements
                      .split(";")
                      .filter((item) => item.trim().length > 0)
                      .map((item, idx) => {
                        const trimmed = item.trim();
                        return (
                          <li key={idx} className="text-[var(--text-secondary)] list-item">
                            {trimmed}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection jour/repas pour ajouter une recette depuis la page d'accueil */}
      {showMealSelectionModal && recipeToAddToMenu && menu && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF0F0] rounded-2xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Ajouter "{recipeToAddToMenu.nom}" au menu</h3>
              <button
                onClick={() => {
                  setShowMealSelectionModal(false);
                  setRecipeToAddToMenu(null);
                }}
                className="text-[var(--text-muted)]"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Choisis le jour et le repas pour ajouter cette recette
            </p>
            <div className="space-y-2">
              {menu.days.map((day) => (
                <div key={day.date} className="rounded-xl bg-[#FFD9D9] border border-[#E8A0A0] p-3">
                  <h4 className="font-semibold text-xs mb-2 text-[var(--text-primary)]">
                    {formatDateDisplay(day.date)}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {MEAL_TYPES.filter((mt) => mt.key !== "collation").map((mealType) => (
                      <button
                        key={mealType.key}
                        onClick={() => handleAddRecipeToMeal(day.date, mealType.key)}
                        className="px-3 py-2 rounded-xl bg-white border border-[#E8A0A0] hover:border-[#D44A4A] transition-colors text-xs text-[var(--text-primary)]"
                      >
                        <span className="text-sm">{mealType.icon}</span>
                        <span className="block mt-1">{mealType.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal conseils de la diététicienne */}
      {showAdviceModal && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF0F0] rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">
                  💬 Avis de ta diététicienne
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Conseils personnalisés pour améliorer ton menu
                </p>
              </div>
              <button
                onClick={() => setShowAdviceModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            {/* Bouton pour analyser une photo de repas */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setShowAdviceModal(false);
                  setShowCameraForAdvice(true);
                }}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
              >
                📷 Analyser une photo de repas pour des conseils personnalisés
              </button>
            </div>

            <div className="space-y-3">
              {menuAdvice.map((advice, index) => (
                <div
                  key={index}
                  className={`rounded-xl p-4 border ${
                    advice.priority === "high"
                      ? "bg-[#FFD9D9] border-[#D44A4A]"
                      : advice.priority === "medium"
                      ? "bg-[#FFD9D9] border-[#E8A0A0]"
                      : "bg-white border-[#E8A0A0]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{advice.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-1">
                        {advice.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {advice.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAdviceModal(false)}
              className="w-full mt-4 px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A]"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}

      {/* Modal pour cocher ce qu'on a déjà */}
      {showShoppingListModal && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF0F0] rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">
                  🛒 Liste de courses complète
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Coche ce que tu as déjà chez toi
                </p>
              </div>
              <button
                onClick={() => setShowShoppingListModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
              {shoppingListData.map((item, index) => (
                <label
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    item.hasAtHome
                      ? "bg-[#FFC4C4] border-[#D44A4A]"
                      : "bg-white border-[#E8A0A0] hover:border-[#D44A4A]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.hasAtHome}
                    onChange={() => handleToggleItem(index)}
                    className="w-5 h-5 rounded border-[#E8A0A0] text-[#D44A4A] focus:ring-[#D44A4A]"
                  />
                  <span className="text-sm text-[var(--text-primary)] flex-1">
                    {formatShoppingListItem(item)}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowShoppingListModal(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-[#FFD9D9] border border-[#E8A0A0] text-sm text-[var(--text-primary)] hover:border-[#D44A4A]"
              >
                Annuler
              </button>
              <button
                onClick={handleValidateShoppingList}
                className="flex-1 px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A]"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'export de la liste de courses */}
      {showExportModal && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF0F0] rounded-2xl p-6">
            <h3 className="font-semibold text-lg mb-4 text-[var(--text-primary)]">
              Exporter la liste de courses
            </h3>
            <div className="space-y-3 mb-4">
              <button
                onClick={handleExportAsText}
                className="w-full px-4 py-3 rounded-xl bg-[#FFD9D9] border border-[#E8A0A0] text-sm text-[var(--text-primary)] hover:border-[#D44A4A]"
              >
                📄 Télécharger en texte (.txt)
              </button>
              <button
                onClick={handleExportAsImage}
                className="w-full px-4 py-3 rounded-xl bg-[#FFD9D9] border border-[#E8A0A0] text-sm text-[var(--text-primary)] hover:border-[#D44A4A]"
              >
                🖼️ Télécharger en image (.png)
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="w-full px-4 py-3 rounded-xl bg-[#FFD9D9] border border-[#E8A0A0] text-sm text-[var(--text-primary)] hover:border-[#D44A4A]"
              >
                📋 Copier dans le presse-papiers
              </button>
            </div>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Modal de prise de photo pour les conseils diététicien */}
      {showCameraForAdvice && (
        <CameraCapture
          onCapture={handleCaptureAdvicePhoto}
          onClose={() => {
            setShowCameraForAdvice(false);
            setCapturedAdviceImage(null);
          }}
          title="Photo de ton repas pour conseils"
        />
      )}

      {/* Modal d'analyse de repas avec conseils diététicien (inspiré de Foodvisor) */}
      {showAdviceWithPhoto && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* En-tête avec l'image du repas */}
            <div className="relative">
              {capturedAdviceImage && (
                <div className="relative w-full h-64 bg-gray-100">
                  <img
                    src={capturedAdviceImage}
                    alt="Repas analysé"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <h3 className="text-white font-bold text-lg mb-1">
                  {adviceMealAnalysis?.mealName || "Analyse en cours..."}
                </h3>
                <p className="text-white/90 text-sm">CONSEILS PERSONNALISÉS</p>
              </div>
            </div>

            {/* Contenu de l'analyse avec conseils */}
            <div className="p-6">
              {analyzingAdviceMeal ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
                  <p className="text-[var(--text-secondary)]">Analyse de ton repas en cours...</p>
                </div>
              ) : adviceMealAnalysis?.error ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-4">{adviceMealAnalysis.error}</p>
                  <button
                    onClick={() => {
                      setShowAdviceWithPhoto(false);
                      setShowCameraForAdvice(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600"
                  >
                    Réessayer
                  </button>
                </div>
              ) : adviceMealAnalysis ? (
                <>
                  {/* Évaluation générale - Style Foodvisor */}
                  <div className="mb-6 text-center">
                    <div className={`inline-block px-8 py-4 rounded-3xl font-bold text-3xl mb-3 shadow-lg ${
                      adviceMealAnalysis.advice?.rating === "VERY_GOOD"
                        ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white"
                        : adviceMealAnalysis.advice?.rating === "GOOD"
                        ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
                        : "bg-gradient-to-br from-orange-400 to-red-500 text-white"
                    }`}>
                      {adviceMealAnalysis.advice?.rating === "VERY_GOOD"
                        ? "TRÈS BON"
                        : adviceMealAnalysis.advice?.rating === "GOOD"
                        ? "BON"
                        : "À AMÉLIORER"}
                    </div>
                    <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                      {adviceMealAnalysis.estimatedCalories || 0} Kcal
                    </p>
                  </div>

                  {/* Ingrédients détectés */}
                  {adviceMealAnalysis.ingredients && adviceMealAnalysis.ingredients.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Ingrédients détectés</h4>
                      <div className="flex flex-wrap gap-2">
                        {adviceMealAnalysis.ingredients.map((ing: any, idx: number) => (
                          <div
                            key={idx}
                            className="px-3 py-1.5 rounded-full bg-gray-100 text-xs text-[var(--text-primary)] flex items-center gap-1"
                          >
                            <span>{ing.name}</span>
                            <span className="text-[var(--text-light)]">
                              {Math.round((ing.confidence || 0) * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Macros - Style Foodvisor avec cercles colorés */}
                  {adviceMealAnalysis.nutrients && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Macronutriments</h4>
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { key: "fats", label: "Lipides", value: adviceMealAnalysis.nutrients.fats, unit: "g", color: "bg-gradient-to-br from-yellow-400 to-amber-500", borderColor: "border-yellow-300" },
                          { key: "proteins", label: "Protéines", value: adviceMealAnalysis.nutrients.proteins, unit: "g", color: "bg-gradient-to-br from-blue-400 to-cyan-500", borderColor: "border-blue-300" },
                          { key: "carbs", label: "Glucides", value: adviceMealAnalysis.nutrients.carbs, unit: "g", color: "bg-gradient-to-br from-purple-400 to-pink-500", borderColor: "border-purple-300" },
                          { key: "fibers", label: "Fibres", value: adviceMealAnalysis.nutrients.fibers, unit: "g", color: "bg-gradient-to-br from-green-400 to-emerald-500", borderColor: "border-green-300" },
                        ].map((nutrient) => (
                          <div key={nutrient.key} className="text-center">
                            <div className={`w-20 h-20 rounded-full ${nutrient.color} border-4 ${nutrient.borderColor} mx-auto mb-2 flex items-center justify-center text-white font-bold text-base shadow-lg`}>
                              {nutrient.value}
                            </div>
                            <p className="text-xs font-semibold text-[var(--text-primary)]">{nutrient.label}</p>
                            <p className="text-xs text-[var(--text-muted)]">{nutrient.value}{nutrient.unit}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conseils détaillés du diététicien */}
                  {adviceMealAnalysis.advice && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <span className="text-2xl">💬</span>
                        <span>Conseils personnalisés de ta diététicienne</span>
                      </h4>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4 mb-3">
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                          {adviceMealAnalysis.advice.message}
                        </p>
                      </div>
                      {adviceMealAnalysis.advice.suggestions && adviceMealAnalysis.advice.suggestions.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">💡 Suggestions d'amélioration :</p>
                          {adviceMealAnalysis.advice.suggestions.map((suggestion: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 bg-white border border-green-100 rounded-xl p-3">
                              <span className="text-green-500 text-lg mt-0.5">✨</span>
                              <span className="text-sm text-[var(--text-primary)] flex-1">{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bouton de fermeture */}
                  <button
                    onClick={() => {
                      setShowAdviceWithPhoto(false);
                      setCapturedAdviceImage(null);
                      setAdviceMealAnalysis(null);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors"
                  >
                    J'ai compris, merci !
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Modal de prise de photo pour analyser un repas */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCaptureMealPhoto}
          onClose={() => {
            setShowCamera(false);
            setCapturedMealImage(null);
          }}
          title="Photo de ton repas"
        />
      )}

      {/* Modal d'analyse du repas (inspiré de Foodvisor) */}
      {showMealAnalysis && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* En-tête avec l'image du repas */}
            <div className="relative">
              {capturedMealImage && (
                <div className="relative w-full h-64 bg-gray-100">
                  <img
                    src={capturedMealImage}
                    alt="Repas analysé"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors">
                      ⭐
                    </button>
                    <button className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors">
                      📤
                    </button>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <h3 className="text-white font-bold text-lg mb-1">
                  {mealAnalysis?.mealName || "Analyse en cours..."}
                </h3>
                <p className="text-white/90 text-sm">DÉJEUNER</p>
              </div>
            </div>

            {/* Contenu de l'analyse */}
            <div className="p-6">
              {analyzingMeal ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
                  <p className="text-[var(--text-secondary)]">Analyse de ton repas en cours...</p>
                </div>
              ) : mealAnalysis?.error ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-4">{mealAnalysis.error}</p>
                  <button
                    onClick={() => {
                      setShowMealAnalysis(false);
                      setShowCamera(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600"
                  >
                    Réessayer
                  </button>
                </div>
              ) : mealAnalysis ? (
                <>
                  {/* Évaluation générale - Style Foodvisor */}
                  <div className="mb-6 text-center">
                    <div className={`inline-block px-8 py-4 rounded-3xl font-bold text-3xl mb-3 shadow-lg ${
                      mealAnalysis.advice?.rating === "VERY_GOOD"
                        ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white"
                        : mealAnalysis.advice?.rating === "GOOD"
                        ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
                        : "bg-gradient-to-br from-orange-400 to-red-500 text-white"
                    }`}>
                      {mealAnalysis.advice?.rating === "VERY_GOOD"
                        ? "TRÈS BON"
                        : mealAnalysis.advice?.rating === "GOOD"
                        ? "BON"
                        : "À AMÉLIORER"}
                    </div>
                    <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                      {mealAnalysis.estimatedCalories || 0} Kcal
                    </p>
                  </div>

                  {/* Ingrédients détectés */}
                  {mealAnalysis.ingredients && mealAnalysis.ingredients.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Ingrédients détectés</h4>
                      <div className="flex flex-wrap gap-2">
                        {mealAnalysis.ingredients.map((ing: any, idx: number) => (
                          <div
                            key={idx}
                            className="px-3 py-1.5 rounded-full bg-gray-100 text-xs text-[var(--text-primary)] flex items-center gap-1"
                          >
                            <span>{ing.name}</span>
                            <span className="text-[var(--text-light)]">
                              {Math.round((ing.confidence || 0) * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Macros - Style Foodvisor avec cercles colorés */}
                  {mealAnalysis.nutrients && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Macronutriments</h4>
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { key: "fats", label: "Lipides", value: mealAnalysis.nutrients.fats, unit: "g", color: "bg-gradient-to-br from-yellow-400 to-amber-500", borderColor: "border-yellow-300" },
                          { key: "proteins", label: "Protéines", value: mealAnalysis.nutrients.proteins, unit: "g", color: "bg-gradient-to-br from-blue-400 to-cyan-500", borderColor: "border-blue-300" },
                          { key: "carbs", label: "Glucides", value: mealAnalysis.nutrients.carbs, unit: "g", color: "bg-gradient-to-br from-purple-400 to-pink-500", borderColor: "border-purple-300" },
                          { key: "fibers", label: "Fibres", value: mealAnalysis.nutrients.fibers, unit: "g", color: "bg-gradient-to-br from-green-400 to-emerald-500", borderColor: "border-green-300" },
                        ].map((nutrient) => (
                          <div key={nutrient.key} className="text-center">
                            <div className={`w-20 h-20 rounded-full ${nutrient.color} border-4 ${nutrient.borderColor} mx-auto mb-2 flex items-center justify-center text-white font-bold text-base shadow-lg`}>
                              {nutrient.value}
                            </div>
                            <p className="text-xs font-semibold text-[var(--text-primary)]">{nutrient.label}</p>
                            <p className="text-xs text-[var(--text-muted)]">{nutrient.value}{nutrient.unit}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conseils du diététicien */}
                  {mealAnalysis.advice && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">💬 Conseils de ta diététicienne</h4>
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-3">
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                          {mealAnalysis.advice.message}
                        </p>
                      </div>
                      {mealAnalysis.advice.suggestions && mealAnalysis.advice.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Suggestions d'amélioration :</p>
                          {mealAnalysis.advice.suggestions.map((suggestion: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                              <span className="text-green-500 mt-0.5">•</span>
                              <span>{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowMealAnalysis(false);
                        setCapturedMealImage(null);
                        setMealAnalysis(null);
                      }}
                      className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-[var(--text-primary)] font-semibold text-sm hover:bg-gray-200 transition-colors"
                    >
                      ✕ Supprimer
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Ajouter le repas au menu
                        setShowMealAnalysis(false);
                        setCapturedMealImage(null);
                        setMealAnalysis(null);
                      }}
                      className="flex-1 px-4 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors"
                    >
                      ✓ Valider mon repas
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

