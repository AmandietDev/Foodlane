// Analyse nutritionnelle du menu et génération de conseils

import type { WeeklyMenu } from "./weeklyMenu";
import type { Recipe } from "./recipes";

export interface MenuAdvice {
  title: string;
  description: string;
  icon: string;
  priority: "high" | "medium" | "low";
}

// Analyser le menu et générer des conseils
export function analyzeMenu(menu: WeeklyMenu, recipes: Recipe[]): MenuAdvice[] {
  const advice: MenuAdvice[] = [];

  // Récupérer toutes les recettes du menu
  const menuRecipes: Recipe[] = [];
  menu.days.forEach((day) => {
    Object.values(day.meals).forEach((meal) => {
      if (meal && meal.recipes) {
        meal.recipes.forEach((recipe) => {
          const fullRecipe = recipes.find((r) => r.id === recipe.id);
          if (fullRecipe) {
            menuRecipes.push(fullRecipe);
          } else {
            // Si la recette complète n'est pas trouvée, utiliser celle du menu
            menuRecipes.push(recipe);
          }
        });
      }
    });
  });

  if (menuRecipes.length === 0) {
    return [
      {
        title: "Menu vide",
        description: "Ajoute des recettes à ton menu pour obtenir des conseils personnalisés.",
        icon: "📝",
        priority: "medium",
      },
    ];
  }

  // Analyser les ingrédients pour détecter les groupes alimentaires
  const allIngredients = menuRecipes
    .map((r) => r.ingredients.toLowerCase())
    .join(" ");

  // Détecter les légumes
  const vegetables = [
    "tomate", "courgette", "aubergine", "poivron", "concombre", "salade",
    "carotte", "brocoli", "chou", "champignon", "épinard", "haricot vert",
    "petit pois", "asperge", "artichaut", "radis", "navet", "poireau",
    "endive", "mâche", "courge", "potiron", "patate douce",
  ];
  const hasVegetables = vegetables.some((veg) => allIngredients.includes(veg));

  // Détecter les fruits
  const fruits = [
    "pomme", "poire", "orange", "citron", "fraise", "framboise", "myrtille",
    "pêche", "abricot", "cerise", "melon", "pastèque", "raisin", "prune",
    "figue", "kiwi", "banane", "mangue", "ananas", "clémentine", "mandarine",
  ];
  const hasFruits = fruits.some((fruit) => allIngredients.includes(fruit));

  // Détecter les protéines
  const proteins = [
    "poulet", "bœuf", "porc", "agneau", "saumon", "cabillaud", "thon",
    "crevette", "moule", "jambon", "bacon", "lardon", "saucisse", "œuf",
    "lentille", "pois chiche", "haricot rouge", "tofu",
  ];
  const hasProteins = proteins.some((prot) => allIngredients.includes(prot));

  // Détecter les féculents
  const starches = [
    "pâtes", "riz", "pomme de terre", "patate", "pain", "quinoa", "boulgour",
    "semoule", "patate douce",
  ];
  const hasStarches = starches.some((starch) => allIngredients.includes(starch));

  // Détecter les produits laitiers
  const dairy = [
    "lait", "yaourt", "fromage", "crème", "beurre", "fromage blanc",
    "mozzarella", "chèvre", "parmesan", "emmental", "comté", "gruyère",
  ];
  const hasDairy = dairy.some((d) => allIngredients.includes(d));

  // Compter les repas par type
  const mealCounts = {
    petitDejeuner: 0,
    dejeuner: 0,
    diner: 0,
  };
  menu.days.forEach((day) => {
    if (day.meals["petit-dejeuner"]?.recipes && day.meals["petit-dejeuner"].recipes.length > 0) mealCounts.petitDejeuner++;
    if (day.meals.dejeuner?.recipes && day.meals.dejeuner.recipes.length > 0) mealCounts.dejeuner++;
    if (day.meals.diner?.recipes && day.meals.diner.recipes.length > 0) mealCounts.diner++;
  });

  // Générer des conseils basés sur l'analyse

  // Conseil 1: Légumes
  if (!hasVegetables) {
    advice.push({
      title: "Ajoute des légumes",
      description: "Ton menu manque de légumes. Pense à ajouter des légumes de saison à tes repas pour un meilleur équilibre nutritionnel et plus de fibres.",
      icon: "🥬",
      priority: "high",
    });
  } else if (menuRecipes.length > 3 && !allIngredients.includes("légume")) {
    advice.push({
      title: "Varie les légumes",
      description: "Essaie d'inclure différents types de légumes (verts, racines, légumineuses) pour bénéficier de tous leurs nutriments.",
      icon: "🥕",
      priority: "medium",
    });
  }

  // Conseil 2: Fruits
  if (!hasFruits) {
    advice.push({
      title: "Pense aux fruits",
      description: "Ajoute des fruits frais de saison en dessert ou en collation pour faire le plein de vitamines et d'antioxydants.",
      icon: "🍎",
      priority: "high",
    });
  }

  // Conseil 3: Protéines
  if (!hasProteins) {
    advice.push({
      title: "Inclus des protéines",
      description: "Assure-toi d'avoir des sources de protéines (viande, poisson, œufs, légumineuses) dans tes repas principaux pour maintenir ta masse musculaire.",
      icon: "🍗",
      priority: "high",
    });
  } else {
    // Vérifier la variété des protéines
    const proteinTypes = proteins.filter((p) => allIngredients.includes(p));
    if (proteinTypes.length === 1 && menuRecipes.length > 2) {
      advice.push({
        title: "Varie tes sources de protéines",
        description: "Alterne entre viande, poisson, œufs et légumineuses pour un apport nutritionnel plus complet.",
        icon: "🐟",
        priority: "medium",
      });
    }
  }

  // Conseil 4: Féculents
  if (!hasStarches) {
    advice.push({
      title: "N'oublie pas les féculents",
      description: "Les féculents (pâtes, riz, pommes de terre) apportent de l'énergie durable. Inclus-en dans tes repas principaux.",
      icon: "🍝",
      priority: "medium",
    });
  }

  // Conseil 5: Petit-déjeuner
  if (mealCounts.petitDejeuner === 0) {
    advice.push({
      title: "Pense au petit-déjeuner",
      description: "Un petit-déjeuner équilibré (protéines + féculents + fruits) te donne de l'énergie pour toute la matinée.",
      icon: "🌅",
      priority: "medium",
    });
  }

  // Conseil 6: Variété
  if (menuRecipes.length > 0) {
    const uniqueRecipes = new Set(menuRecipes.map((r) => r.id));
    if (uniqueRecipes.size < menuRecipes.length * 0.7) {
      advice.push({
        title: "Varie tes recettes",
        description: "Essaie de varier davantage tes recettes pour éviter la monotonie et bénéficier d'une plus grande diversité nutritionnelle.",
        icon: "🔄",
        priority: "low",
      });
    }
  }

  // Conseil 7: Produits laitiers (optionnel)
  if (!hasDairy && menuRecipes.length > 2) {
    advice.push({
      title: "Pense aux produits laitiers",
      description: "Les produits laitiers sont une bonne source de calcium. Tu peux les inclure dans tes repas ou en collation.",
      icon: "🥛",
      priority: "low",
    });
  }

  // Limiter à 4 conseils maximum, en privilégiant les priorités élevées
  const sortedAdvice = advice.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return sortedAdvice.slice(0, 4);
}

