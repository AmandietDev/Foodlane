// Gestion du menu de la semaine

import type { Recipe } from "./recipes";

export type MealType = "petit-dejeuner" | "dejeuner" | "diner" | "collation";

export interface WeeklyMenuMeal {
  recipes: Recipe[]; // Tableau de recettes pour permettre plusieurs recettes par repas
  mealType: MealType;
}

// Pour la rétrocompatibilité : ancienne structure (une seule recette)
export interface LegacyWeeklyMenuMeal {
  recipe: Recipe | null;
  mealType: MealType;
}

export interface WeeklyMenuDay {
  date: string; // Format YYYY-MM-DD
  meals: {
    "petit-dejeuner": WeeklyMenuMeal;
    "dejeuner": WeeklyMenuMeal;
    "diner": WeeklyMenuMeal;
    "collation": WeeklyMenuMeal | null;
  };
}

export interface WeeklyMenu {
  id: string;
  startDate: string; // Format YYYY-MM-DD
  endDate: string; // Format YYYY-MM-DD
  days: WeeklyMenuDay[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

const STORAGE_KEY = "foodlane_weekly_menus";

// Fonction pour migrer l'ancienne structure vers la nouvelle
function migrateMenuToNewFormat(menu: any): WeeklyMenu {
  const migratedDays = menu.days.map((day: any) => {
    const migratedMeals: any = {};
    
    Object.keys(day.meals).forEach((mealType) => {
      const meal = day.meals[mealType];
      if (!meal) {
        migratedMeals[mealType] = null;
        return;
      }
      
      // Si c'est l'ancienne structure (avec recipe au lieu de recipes)
      if ('recipe' in meal && !('recipes' in meal)) {
        migratedMeals[mealType] = {
          recipes: meal.recipe ? [meal.recipe] : [],
          mealType: meal.mealType || mealType,
        };
      } else {
        // C'est déjà la nouvelle structure
        migratedMeals[mealType] = {
          recipes: meal.recipes || [],
          mealType: meal.mealType || mealType,
        };
      }
    });
    
    return {
      ...day,
      meals: migratedMeals,
    };
  });
  
  return {
    ...menu,
    days: migratedDays,
  };
}

// Obtenir le menu de la semaine actuelle
export function getCurrentWeekMenu(): WeeklyMenu | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const menus: any[] = JSON.parse(stored);
    const today = new Date();
    const todayStr = formatDate(today);

    // Trouver le menu qui couvre la semaine actuelle
    const currentMenu = menus.find((menu) => {
      return todayStr >= menu.startDate && todayStr <= menu.endDate;
    });

    if (!currentMenu) return null;
    
    // Migrer vers la nouvelle structure si nécessaire
    return migrateMenuToNewFormat(currentMenu);
  } catch (err) {
    console.error("Erreur lors du chargement du menu :", err);
    return null;
  }
}

// Sauvegarder un menu
export function saveWeeklyMenu(menu: WeeklyMenu): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let menus: WeeklyMenu[] = stored ? JSON.parse(stored) : [];

    // Remplacer le menu existant ou ajouter le nouveau
    const existingIndex = menus.findIndex((m) => m.id === menu.id);
    if (existingIndex >= 0) {
      menus[existingIndex] = menu;
    } else {
      menus.push(menu);
    }

    // Trier par date de création (plus récent en premier)
    menus.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    localStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
  } catch (err) {
    console.error("Erreur lors de la sauvegarde du menu :", err);
  }
}

// Obtenir tous les menus sauvegardés
export function getAllWeeklyMenus(): WeeklyMenu[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const menus: any[] = JSON.parse(stored);
    // Migrer tous les menus vers la nouvelle structure
    const migratedMenus = menus.map(migrateMenuToNewFormat);
    return migratedMenus.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Erreur lors du chargement des menus :", err);
    return [];
  }
}

// Créer un nouveau menu avec tous les jours de la semaine (mais sans recettes)
export function createEmptyWeeklyMenu(startDate?: Date): WeeklyMenu {
  const monday = startDate || getMondayOfWeek(new Date());
  const endDate = new Date(monday);
  endDate.setDate(endDate.getDate() + 6); // 7 jours (du lundi au dimanche)

  // Créer tous les jours de la semaine, mais sans recettes
  const days: WeeklyMenuDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    
    days.push({
      date: formatDate(date),
      meals: {
        "petit-dejeuner": { recipes: [], mealType: "petit-dejeuner" },
        "dejeuner": { recipes: [], mealType: "dejeuner" },
        "diner": { recipes: [], mealType: "diner" },
        "collation": null,
      },
    });
  }

  const now = new Date().toISOString();
  return {
    id: `menu-${Date.now()}`,
    startDate: formatDate(monday),
    endDate: formatDate(endDate),
    days,
    createdAt: now,
    updatedAt: now,
  };
}

// Ajouter un jour au menu
export function addDayToMenu(menu: WeeklyMenu, date: Date): WeeklyMenu {
  const dateStr = formatDate(date);
  
  // Vérifier si le jour existe déjà
  if (menu.days.some((d) => d.date === dateStr)) {
    return menu;
  }

  const newDay: WeeklyMenuDay = {
    date: dateStr,
    meals: {
      "petit-dejeuner": { recipes: [], mealType: "petit-dejeuner" },
      "dejeuner": { recipes: [], mealType: "dejeuner" },
      "diner": { recipes: [], mealType: "diner" },
      "collation": null,
    },
  };

  return {
    ...menu,
    days: [...menu.days, newDay].sort((a, b) => a.date.localeCompare(b.date)),
    updatedAt: new Date().toISOString(),
  };
}

// Supprimer un jour du menu
export function removeDayFromMenu(menu: WeeklyMenu, date: string): WeeklyMenu {
  return {
    ...menu,
    days: menu.days.filter((d) => d.date !== date),
    updatedAt: new Date().toISOString(),
  };
}

// Générer la liste de courses à partir d'un menu
export function generateShoppingList(menu: WeeklyMenu): string[] {
  const ingredientsSet = new Set<string>();

  menu.days.forEach((day) => {
    Object.values(day.meals).forEach((meal) => {
      if (meal && meal.recipes && meal.recipes.length > 0) {
        meal.recipes.forEach((recipe) => {
          if (recipe && recipe.ingredients) {
            const ingredients = recipe.ingredients.split(";");
            ingredients.forEach((ing) => {
              const trimmed = ing.trim();
              if (trimmed) {
                ingredientsSet.add(trimmed);
              }
            });
          }
        });
      }
    });
  });

  return Array.from(ingredientsSet).sort();
}

// Formater une date au format YYYY-MM-DD
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Obtenir le lundi de la semaine pour une date donnée
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour lundi = 1
  return new Date(d.setDate(diff));
}

// Formater une date pour l'affichage
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];
  
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

