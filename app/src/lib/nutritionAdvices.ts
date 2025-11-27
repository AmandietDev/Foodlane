// Gestion de la base de données de conseils nutritionnels

export interface NutritionAdvice {
  id: string;
  text: string;
  objective_tags: string[];
  meal_tags: string[];
  context_tags: string[];
  tone: string;
  cta: string;
}

let advicesCache: NutritionAdvice[] | null = null;

export async function loadNutritionAdvices(): Promise<NutritionAdvice[]> {
  if (advicesCache) {
    return advicesCache;
  }

  try {
    const response = await fetch("/foodlane_nutrition_advices_expert.json");
    if (!response.ok) {
      throw new Error("Impossible de charger les conseils nutritionnels");
    }
    const data = await response.json();
    advicesCache = data as NutritionAdvice[];
    return advicesCache;
  } catch (error) {
    console.error("Erreur lors du chargement des conseils:", error);
    return [];
  }
}

export function mapUserObjectiveToTags(objective: string): string[] {
  const mapping: Record<string, string[]> = {
    "Perte de poids": ["poids_doux", "perte_de_poids", "equilibre"],
    "Prise de masse": ["prise_masse", "prise_de_masse", "equilibre"],
    "Performance sportive": ["performance_sportive", "equilibre"],
    "Maintien": ["equilibre", "maintien"],
    "Santé générale": ["equilibre", "sante"],
    "Rebalancing": ["equilibre", "rebalancing"],
  };
  return mapping[objective] || ["equilibre"];
}

export function analyzeMealContext(meals: string[]): {
  hasLegumes: boolean;
  hasProteines: boolean;
  hasFeculents: boolean;
  hasFruits: boolean;
  hasFastFood: boolean;
  hasSucres: boolean;
  mealCount: number;
  varietyScore: number;
} {
  const allMealsText = meals.join(" ").toLowerCase();
  
  const hasLegumes = /salade|tomate|carotte|courgette|poivron|épinard|brocoli|chou|haricot|légume|avocat|concombre/i.test(allMealsText);
  const hasProteines = /poulet|viande|poisson|thon|saumon|œuf|oeuf|fromage|yaourt|protéine|jambon|dinde/i.test(allMealsText);
  const hasFeculents = /pâtes|riz|pain|quinoa|pomme de terre|patate|patate douce|féculent|pomme de terre|pommes de terre|pâtes|pasta/i.test(allMealsText);
  const hasFruits = /fruit|banane|pomme|orange|fraise|raisin|fruit|kiwi|mangue/i.test(allMealsText);
  const hasFastFood = /macdo|mcdonald|burger|frite|pizza|kebab|fast.food|restaurant|resto/i.test(allMealsText);
  const hasSucres = /nutella|chocolat|gâteau|gateau|biscuit|bonbon|sucre|sucré|dessert|glace/i.test(allMealsText);
  
  const points = [];
  if (hasLegumes) points.push(1);
  if (hasProteines) points.push(1);
  if (hasFeculents) points.push(1);
  if (hasFruits) points.push(1);
  const varietyScore = points.length;
  
  return {
    hasLegumes,
    hasProteines,
    hasFeculents,
    hasFruits,
    hasFastFood,
    hasSucres,
    mealCount: meals.length,
    varietyScore,
  };
}

export function getContextTags(context: ReturnType<typeof analyzeMealContext>): string[] {
  const tags: string[] = [];
  
  if (!context.hasLegumes) tags.push("manque_legumes");
  if (!context.hasProteines) tags.push("manque_proteines");
  if (!context.hasFeculents) tags.push("manque_feculents");
  if (context.hasFastFood) tags.push("fast_food");
  if (context.hasSucres && !context.hasLegumes) tags.push("trop_sucres");
  if (context.mealCount < 3) tags.push("peu_de_repas");
  if (context.varietyScore < 2) tags.push("manque_variete");
  if (context.varietyScore >= 3 && !context.hasFastFood) tags.push("bon_equilibre");
  
  return tags.length > 0 ? tags : ["aucun"];
}

export function findRelevantAdvices(
  advices: NutritionAdvice[],
  userObjective: string,
  context: ReturnType<typeof analyzeMealContext>,
  mealType?: "petit_dejeuner" | "dejeuner" | "diner" | "collation"
): NutritionAdvice[] {
  const objectiveTags = mapUserObjectiveToTags(userObjective);
  const contextTags = getContextTags(context);
  
  // Filtrer les conseils pertinents
  const relevant = advices.filter((advice) => {
    // Vérifier les tags d'objectifs
    const matchesObjective = advice.objective_tags.some((tag) => objectiveTags.includes(tag));
    if (!matchesObjective) return false;
    
    // Vérifier les tags de contexte
    const matchesContext = advice.context_tags.some((tag) => 
      contextTags.includes(tag) || tag === "aucun"
    );
    if (!matchesContext) return false;
    
    // Vérifier les tags de repas
    if (mealType) {
      const mealTagMap: Record<string, string> = {
        petit_dejeuner: "petit_dejeuner",
        dejeuner: "dejeuner",
        diner: "diner",
        collation: "collation",
      };
      const matchesMeal = advice.meal_tags.includes(mealTagMap[mealType]) || 
                         advice.meal_tags.includes("global");
      if (!matchesMeal) return false;
    } else {
      // Si pas de repas spécifique, prendre ceux avec "global"
      if (!advice.meal_tags.includes("global")) return false;
    }
    
    return true;
  });
  
  // Trier par pertinence (priorité aux context_tags spécifiques qui matchent)
  const sorted = relevant.sort((a, b) => {
    // Compter combien de context_tags matchent (hors "aucun")
    const aMatches = a.context_tags.filter(tag => tag !== "aucun" && contextTags.includes(tag)).length;
    const bMatches = b.context_tags.filter(tag => tag !== "aucun" && contextTags.includes(tag)).length;
    
    // Priorité aux conseils avec plus de matches
    if (aMatches > bMatches) return -1;
    if (aMatches < bMatches) return 1;
    
    // Si égalité, priorité aux conseils sans "aucun" (plus spécifiques)
    const aHasAucun = a.context_tags.includes("aucun");
    const bHasAucun = b.context_tags.includes("aucun");
    if (!aHasAucun && bHasAucun) return -1;
    if (aHasAucun && !bHasAucun) return 1;
    
    return 0;
  });
  
  return sorted;
}

export function selectBestAdvices(
  advices: NutritionAdvice[],
  count: number = 3
): NutritionAdvice[] {
  // Mélanger et prendre les premiers pour avoir de la variété
  const shuffled = [...advices].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

