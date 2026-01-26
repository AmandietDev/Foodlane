/**
 * Moteur d'analyse journalière : calcule le score et génère les conseils
 * Basé sur la variété, structure, fibres, régularité, satiété, alignement objectif
 */

import { ParsedMeal } from "./foodParser";

export interface DailySummary {
  score: number;
  strengths: string[];
  priority_tip: string;
  tip_options: string[];
  missing_components: string[];
  plan_for_tomorrow: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snack: string[];
  };
  meta: {
    components_found: string[];
    rules_triggered: string[];
  };
}

export interface MealEntry {
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  parsed: ParsedMeal;
  hunger_before?: number;
  satiety_after?: number;
}

export interface UserContext {
  objective?: string; // weight_loss, muscle_gain, cook_more, reduce_meat, better_energy, digestive_comfort
  allergies?: string[];
  diets?: string[]; // vegetarian, vegan, no_pork, lactose_free, etc.
  behavioral_preferences?: string[]; // "je grignote le soir", "je manque de temps", etc.
}

/**
 * Calcule le score de qualité (0-100) basé sur plusieurs critères
 */
function calculateScore(meals: MealEntry[], context: UserContext): number {
  let score = 0;
  const rulesTriggered: string[] = [];
  
  // Compter les repas structurés (pas juste des collations)
  const structuredMeals = meals.filter(m => 
    m.meal_type !== "snack" || 
    (m.parsed.components.protein.length > 0 || m.parsed.components.veggie.length > 0)
  );
  
  // +20 si légumes présents dans ≥1 repas
  const hasVeggies = meals.some(m => m.parsed.components.veggie.length > 0);
  if (hasVeggies) {
    score += 20;
    rulesTriggered.push("has_veggies");
  }
  
  // +15 si protéines présentes dans ≥2 repas
  const proteinMeals = meals.filter(m => m.parsed.components.protein.length > 0);
  if (proteinMeals.length >= 2) {
    score += 15;
    rulesTriggered.push("protein_distributed");
  } else if (proteinMeals.length === 1) {
    score += 8;
  }
  
  // +10 si fruits présents
  const hasFruits = meals.some(m => m.parsed.components.fruit.length > 0);
  if (hasFruits) {
    score += 10;
    rulesTriggered.push("has_fruits");
  }
  
  // +10 si féculents présents au dîner (satiété) OU si prise de masse
  const dinnerMeal = meals.find(m => m.meal_type === "dinner");
  const dinnerHasCarbs = Boolean(dinnerMeal?.parsed?.components?.carb && dinnerMeal.parsed.components.carb.length > 0);
  if (dinnerHasCarbs && (context.objective === "weight_loss" || context.objective === "muscle_gain")) {
    score += 10;
    rulesTriggered.push("dinner_carbs_for_satiety");
  }
  
  // +10 si "fait maison" détectable (pas de fast food)
  const hasFastFood = meals.some(m => m.parsed.components.treat.some(t => 
    ["burger", "frite", "pizza", "kebab", "macdo"].some(ff => t.includes(ff))
  ));
  if (!hasFastFood && structuredMeals.length >= 2) {
    score += 10;
    rulesTriggered.push("home_cooked");
  }
  
  // +10 si régularité (au moins 2 repas structurés)
  if (structuredMeals.length >= 2) {
    score += 10;
    rulesTriggered.push("regular_meals");
  }
  
  // Bonus satiété si données disponibles
  const avgSatiety = meals
    .filter(m => m.satiety_after !== undefined)
    .map(m => m.satiety_after!)
    .reduce((sum, val, _, arr) => sum + val / arr.length, 0);
  if (avgSatiety >= 4) {
    score += 5;
    rulesTriggered.push("good_satiety");
  }
  
  // Bonus alignement objectif
  if (context.objective === "weight_loss" && hasVeggies && !hasFastFood) {
    score += 10;
    rulesTriggered.push("aligned_weight_loss");
  } else if (context.objective === "muscle_gain" && proteinMeals.length >= 2) {
    score += 10;
    rulesTriggered.push("aligned_muscle_gain");
  } else if (context.objective === "reduce_meat" && proteinMeals.every(m => 
    m.parsed.components.protein.some(p => 
      ["lentilles", "haricots", "tofu", "tempeh"].some(v => p.includes(v))
    )
  )) {
    score += 10;
    rulesTriggered.push("aligned_reduce_meat");
  }
  
  // Pénalités
  // -30 si repas très incomplets répétés
  const incompleteMeals = meals.filter(m => 
    m.parsed.components.protein.length === 0 &&
    m.parsed.components.veggie.length === 0 &&
    m.parsed.components.carb.length === 0
  );
  if (incompleteMeals.length >= 2) {
    score -= 30;
    rulesTriggered.push("many_incomplete_meals");
  }
  
  // Bonus compatibilité régime
  if (context.diets?.includes("vegetarian") || context.diets?.includes("vegan")) {
    const hasMeat = meals.some(m => m.parsed.components.protein.some(p => 
      ["poulet", "viande", "bœuf", "boeuf", "porc", "jambon"].some(meat => p.includes(meat))
    ));
    if (!hasMeat) {
      score += 5;
      rulesTriggered.push("diet_compliant");
    }
  }
  
  // Plafonner entre 0 et 100
  score = Math.max(0, Math.min(100, score));
  
  return score;
}

/**
 * Génère les points forts (2-3 max)
 */
function generateStrengths(meals: MealEntry[], score: number): string[] {
  const strengths: string[] = [];
  
  const hasVeggies = meals.some(m => m.parsed.components.veggie.length > 0);
  const proteinMeals = meals.filter(m => m.parsed.components.protein.length > 0);
  const hasFruits = meals.some(m => m.parsed.components.fruit.length > 0);
  const structuredMeals = meals.filter(m => m.meal_type !== "snack");
  
  if (hasVeggies) {
    strengths.push("Bonne présence de légumes");
  }
  if (proteinMeals.length >= 2) {
    strengths.push("Protéines bien réparties sur la journée");
  } else if (proteinMeals.length === 1) {
    strengths.push("Protéines présentes dans tes repas");
  }
  if (hasFruits) {
    strengths.push("Fruits inclus dans ta journée");
  }
  if (structuredMeals.length >= 3) {
    strengths.push("Régularité des repas respectée");
  }
  if (score >= 70) {
    strengths.push("Équilibre global de qualité");
  }
  
  // Limiter à 3
  return strengths.slice(0, 3);
}

/**
 * Génère le conseil prioritaire (1 seul, hyper clair)
 */
function generatePriorityTip(meals: MealEntry[], context: UserContext): string {
  const hasVeggies = meals.some(m => m.parsed.components.veggie.length > 0);
  const proteinMeals = meals.filter(m => m.parsed.components.protein.length > 0);
  const hasFruits = meals.some(m => m.parsed.components.fruit.length > 0);
  const structuredMeals = meals.filter(m => m.meal_type !== "snack");
  const dinnerMeal = meals.find(m => m.meal_type === "dinner");
  const dinnerHasCarbs = Boolean(dinnerMeal?.parsed?.components?.carb && dinnerMeal.parsed.components.carb.length > 0);
  
  // Priorité selon objectif
  if (context.objective === "weight_loss") {
    if (!hasVeggies) {
      return "Ajoute des légumes à au moins un repas pour mieux caler ta faim et augmenter tes fibres";
    }
    if (!dinnerHasCarbs && structuredMeals.length >= 2) {
      return "Inclus une petite portion de féculents au dîner pour éviter les fringales nocturnes";
    }
    if (proteinMeals.length < 2) {
      return "Répartis tes protéines sur au moins 2 repas pour maintenir ta masse musculaire";
    }
  } else if (context.objective === "muscle_gain") {
    if (proteinMeals.length < 2) {
      return "Ajoute des protéines à chaque repas principal (minimum 2 repas) pour soutenir ta prise de masse";
    }
    if (structuredMeals.length < 3) {
      return "Mange au moins 3 repas complets par jour pour apporter assez de calories et nutriments";
    }
  } else if (context.objective === "reduce_meat") {
    const hasMeat = meals.some(m => m.parsed.components.protein.some(p => 
      ["poulet", "viande", "bœuf", "boeuf", "porc", "jambon"].some(meat => p.includes(meat))
    ));
    if (hasMeat) {
      return "Remplace une source de viande par des légumineuses (lentilles, haricots) ou du tofu pour réduire ta consommation";
    }
  }
  
  // Conseils généraux par priorité
  if (!hasVeggies) {
    return "Ajoute une source de légumes à au moins un repas pour augmenter tes fibres et vitamines";
  }
  if (proteinMeals.length < 2 && structuredMeals.length >= 2) {
    return "Répartis tes protéines sur au moins 2 repas pour un meilleur équilibre";
  }
  if (!hasFruits) {
    return "Inclus un fruit dans ta journée (au petit-déj ou en collation) pour compléter tes apports en vitamines";
  }
  if (structuredMeals.length < 2) {
    return "Essaie de prendre au moins 2 repas structurés par jour pour maintenir ton énergie";
  }
  
  return "Continue à varier tes repas comme tu le fais, c'est parfait !";
}

/**
 * Génère 2 alternatives simples
 */
function generateTipOptions(meals: MealEntry[], priorityTip: string): string[] {
  const options: string[] = [];
  
  const hasVeggies = meals.some(m => m.parsed.components.veggie.length > 0);
  const proteinMeals = meals.filter(m => m.parsed.components.protein.length > 0);
  const hasFruits = meals.some(m => m.parsed.components.fruit.length > 0);
  
  // Générer des alternatives qui ne répètent pas le conseil prioritaire
  if (!priorityTip.includes("légumes") && !hasVeggies) {
    options.push("Option 1 : une poignée de crudités en entrée");
    options.push("Option 2 : un légume cuit en accompagnement");
  } else if (!priorityTip.includes("protéines") && proteinMeals.length < 2) {
    options.push("Option 1 : un œuf au petit-déjeuner");
    options.push("Option 2 : une portion de légumineuses au déjeuner");
  } else if (!priorityTip.includes("fruit") && !hasFruits) {
    options.push("Option 1 : un fruit frais en collation");
    options.push("Option 2 : un fruit au petit-déjeuner");
  } else {
    options.push("Option 1 : varier les couleurs dans ton assiette");
    options.push("Option 2 : inclure une source de fibres à chaque repas");
  }
  
  return options.slice(0, 2);
}

/**
 * Génère le plan pour demain (4 suggestions)
 */
function generatePlanForTomorrow(
  meals: MealEntry[],
  context: UserContext
): DailySummary["plan_for_tomorrow"] {
  const hasVeggies = meals.some(m => m.parsed.components.veggie.length > 0);
  const proteinMeals = meals.filter(m => m.parsed.components.protein.length > 0);
  const hasFruits = meals.some(m => m.parsed.components.fruit.length > 0);
  
  const isVegetarian = context.diets?.includes("vegetarian") || context.diets?.includes("vegan");
  const hasGlutenAllergy = context.allergies?.includes("gluten");
  
  const breakfast: string[] = [];
  const lunch: string[] = [];
  const dinner: string[] = [];
  const snack: string[] = [];
  
  // Petit-déjeuner
  if (hasGlutenAllergy) {
    breakfast.push("Porridge aux flocons d'avoine sans gluten + fruits");
    breakfast.push("Œufs brouillés + avocat + pain sans gluten");
  } else {
    breakfast.push("Tartines complètes + fromage blanc + fruit");
    breakfast.push("Œufs + pain complet + tomate");
  }
  
  // Déjeuner
  if (isVegetarian) {
    lunch.push("Salade de quinoa + légumineuses + légumes");
    lunch.push("Bowl de légumes + tofu + riz");
  } else {
    lunch.push("Salade composée + protéine (poulet/poisson) + féculent");
    lunch.push("Légumes + viande/poisson + riz ou pâtes");
  }
  
  // Dîner
  if (context.objective === "weight_loss") {
    dinner.push("Légumes vapeur + poisson + petite portion de féculents");
    dinner.push("Soupe de légumes + protéine + pain complet");
  } else {
    dinner.push("Légumes + protéine + féculents");
    dinner.push("Plat complet équilibré (légumes + protéine + féculents)");
  }
  
  // Collation
  if (!hasFruits) {
    snack.push("Fruit frais");
    snack.push("Yaourt + fruits");
  } else {
    snack.push("Fruit ou légume cru");
    snack.push("Petite poignée de noix");
  }
  
  return { breakfast, lunch, dinner, snack };
}

/**
 * Analyse principale : génère le résumé journalier complet
 */
export function analyzeDaily(
  meals: MealEntry[],
  context: UserContext = {}
): DailySummary {
  const score = calculateScore(meals, context);
  const strengths = generateStrengths(meals, score);
  const priorityTip = generatePriorityTip(meals, context);
  const tipOptions = generateTipOptions(meals, priorityTip);
  const planForTomorrow = generatePlanForTomorrow(meals, context);
  
  // Identifier les composants manquants
  const missingComponents: string[] = [];
  const hasVeggies = meals.some(m => m.parsed.components.veggie.length > 0);
  const proteinMeals = meals.filter(m => m.parsed.components.protein.length > 0);
  const hasFruits = meals.some(m => m.parsed.components.fruit.length > 0);
  const dinnerMeal = meals.find(m => m.meal_type === "dinner");
  const dinnerHasCarbs = Boolean(dinnerMeal?.parsed?.components?.carb && dinnerMeal.parsed.components.carb.length > 0);
  
  if (!hasVeggies) missingComponents.push("fibres");
  if (proteinMeals.length < 2) missingComponents.push("protéines au dîner");
  if (!hasFruits) missingComponents.push("fruits");
  if (!dinnerHasCarbs && context.objective === "weight_loss") {
    missingComponents.push("féculents au dîner");
  }
  
  // Meta pour debug
  const allComponents = meals.flatMap(m => [
    ...m.parsed.components.protein,
    ...m.parsed.components.veggie,
    ...m.parsed.components.carb,
    ...m.parsed.components.fruit
  ]);
  
  return {
    score,
    strengths,
    priority_tip: priorityTip,
    tip_options: tipOptions,
    missing_components: missingComponents,
    plan_for_tomorrow: planForTomorrow,
    meta: {
      components_found: [...new Set(allComponents)],
      rules_triggered: []
    }
  };
}

