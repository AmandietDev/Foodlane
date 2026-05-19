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

function uniqueTokens(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = v.toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
    if (out.length >= max) break;
  }
  return out;
}

function collectComponents(meals: MealEntry[], key: keyof ParsedMeal["components"]): string[] {
  const acc: string[] = [];
  for (const m of meals) {
    const arr = m.parsed.components[key];
    if (!Array.isArray(arr)) continue;
    for (const t of arr) {
      if (typeof t === "string" && t.trim()) acc.push(t.trim());
    }
  }
  return uniqueTokens(acc, 8);
}

/**
 * Conseils concrets pour le lendemain (repas par créneau) : actions mesurables,
 * pas des formules génériques « protéine + féculent ».
 */
function generatePlanForTomorrow(
  meals: MealEntry[],
  context: UserContext
): DailySummary["plan_for_tomorrow"] {
  const hasBreakfast = meals.some((m) => m.meal_type === "breakfast");
  const breakfastMeals = meals.filter((m) => m.meal_type === "breakfast");
  const hasLunch = meals.some((m) => m.meal_type === "lunch");
  const hasDinner = meals.some((m) => m.meal_type === "dinner");
  const hasVeggies = meals.some((m) => m.parsed.components.veggie.length > 0);
  const hasFruits = meals.some((m) => m.parsed.components.fruit.length > 0);
  const fruitAtBreakfast = breakfastMeals.some((m) => m.parsed.components.fruit.length > 0);
  const proteinMeals = meals.filter((m) => m.parsed.components.protein.length > 0);
  const vegSamples = collectComponents(meals, "veggie");
  const protSamples = collectComponents(meals, "protein");
  const isVegetarian = context.diets?.includes("vegetarian") || context.diets?.includes("vegan");
  const isVegan = context.diets?.includes("vegan");
  const noGluten = context.allergies?.includes("gluten");
  const obj = context.objective;

  const breakfast: string[] = [];
  const lunch: string[] = [];
  const dinner: string[] = [];
  const snack: string[] = [];

  // — Petit-déjeuner
  if (!hasBreakfast) {
    breakfast.push(
      "Demain matin, bloque 12 minutes : flocons d’avoine 40 g + lait (ou boisson végétale) au micro-ondes 2 min, 1 c. à s. de graines (lin ou chia) et 1 fruit (clémentine ou pomme)."
    );
    breakfast.push(
      "Alternative salée : 2 tartines de pain complet + 1 œuf au plat + tomates en rondelles + poivre — tu ajoutes fibres et protéines sans préparation longue."
    );
  } else if (!fruitAtBreakfast && !hasFruits) {
    breakfast.push(
      "Ajoute un fruit entier au petit-déj demain (banane à emporter, ou 120 g de fruits rouges) : viser 1 portion fruit aide vitamine C et potassium dès le matin."
    );
    breakfast.push(
      "Si tu as faim avant midi : yaourt grec nature 125 g + 1 c. à s. de purée d’amande complète + cannelle — mieux qu’un viennoisis seul en sucres rapides."
    );
  } else {
    const v = vegSamples[0];
    breakfast.push(
      v
        ? `Demain matin, varie sans te compliquer : tartine complète + fromage frais + fines lamelles de ${v} (crues ou poêlées 2 min).`
        : "Demain matin, prépare 150–200 g de légumes crus (concombre, radis, carotte râpée) avec fromage frais allégé : fibres + calcium en peu de temps."
    );
    breakfast.push(
      "Hydratation : 1 grand verre d’eau au réveil ; café ou thé 10–15 min après le repas pour ne pas freiner l’absorption du fer des céréales."
    );
  }

  if (isVegan) {
    breakfast[0] =
      "Demain matin : porridge d’avoine (sans gluten si besoin) + lait d’avoine + 1 c. à s. de beurre de cacahuète + banane écrasée — protéines végétales et sucres lents.";
    breakfast[1] =
      "Ou galettes de sarrasin + houmous + roquette + graines de courge torréfiées (1 petite poignée) pour une version salée express.";
  } else if (noGluten) {
    breakfast[0] =
      "Demain matin : galettes de sarrasin sans gluten + chèvre frais + fruit, ou flocons d’avoine sans gluten + lait + fruit.";
    breakfast[1] =
      "Si tu pars tôt : shaker préparé la veille (boisson au riz + protéine en poudre sans gluten + banane mixée) à boire dès le réveil.";
  }

  // — Déjeuner
  if (!hasVeggies) {
    lunch.push(
      "Demain midi, vise une assiette « moitié légumes » : poêlée 300 g (brocoli, carotte, courgette) à l’huile d’olive (1 c. à s.), ail, citron — cuisson wok 5–6 min."
    );
    lunch.push(
      isVegetarian
        ? "Complète avec 150 g de légumineuses égouttées (pois chiches ou lentilles corail) + 80 g de quinoa cuit : tu sécurises protéines et satiété."
        : "Ajoute 120–150 g de protéine maigre (filet de poulet à la poêle, lieu noir au four, ou steak haché 5 % dans une poêle antiadhésive sans matière grasse ajoutée)."
    );
  } else if (proteinMeals.length < 2) {
    lunch.push(
      isVegetarian
        ? "Demain midi, double la protéine végétale : bol 200 g riz complet + 150 g tempeh mariné (soja + jus de citron + paprika) sur lit de salade."
        : "Demain midi, une protéine simple : 2 œufs mollet sur salade OU 120 g thon naturel égoutté mélangé à 150 g fromage blanc 0 % + ciboulette."
    );
    lunch.push(
      "Portion féculent midi : 80 g pesés crus de pâtes complètes ou riz complet (équivalent standard pour un après-midi actif sans somnolence)."
    );
  } else {
    const p = protSamples[0] ?? "ta protéine habituelle";
    const v = vegSamples[0] ?? "tes légumes de saison";
    lunch.push(
      `Demain midi, en 20 min : wok très chaud sur ${v}, puis ${p} en morceaux réguliers pour une cuisson homogène ; termine au citron.`
    );
    lunch.push(
      "Assaisonnement mesuré : 1 c. à s. d’huile au total pour l’assiette + herbes fraîches (aneth, coriandre) pour du goût sans sel en excès."
    );
  }

  if (!hasLunch) {
    lunch[0] =
      "Tu n’as pas noté de déjeuner : demain midi, prépare une lunchbox veille au soir (crudités + féculent + boîte de protéine) pour ne pas grignoter sur le pouce.";
    lunch[1] =
      "Si cantine / extérieur : repère une assiette où tu vois des légumes visibles + une protéine identifiable (évite la formule 100 % frites + soda).";
  }

  // — Dîner
  if (obj === "weight_loss") {
    dinner.push(
      "Demain soir : 400–500 mL de soupe maison de légumes + 100–120 g de poisson blanc vapeur + 3 c. à s. de riz complet cuit (≈ 60 g cuit) pour finir léger mais nourri."
    );
    dinner.push(
      "Sauce : remplace crème fraîche par 150 g fromage blanc 0 % + 1 c. à c. moutarde + bouillon — même onctuosité, moins de lipides saturés."
    );
  } else if (obj === "muscle_gain") {
    dinner.push(
      "Demain soir : 150 g pommes de terre rôties aux herbes + 150 g protéine (viande/poisson) ou 200 g tofu pressé + salade verte à volonté."
    );
    dinner.push(
      "Option récup : 250 ml lait ou boisson protéinée + 20 g poudre + fruits rouges 1 h avant le coucher si entraînement en fin de journée."
    );
  } else {
    dinner.push(
      "Demain soir, plat « une poêle » : courgettes + oignon + pois chiches égouttés + œufs brouillés + cumin/paprika — peu de vaisselle, beaucoup de fibres."
    );
    dinner.push(
      "Après 20 h, évite sucres rapides seuls : infusion + 2 carrés chocolat noir ≥ 70 % si envie sucrée, ou fromage + quelques noisettes."
    );
  }

  if (!hasDinner) {
    dinner[0] =
      "Tu n’as pas noté de dîner : demain, cuisine 15 min plus tôt que d’habitude (alarme 19 h) pour éviter le grignotage devant un écran affamé.";
    dinner[1] =
      "Repère au frigo 2 légumes + 1 protéine + 1 féculent avant la journée : moins de décision « à froid » le soir.";
  }

  // — Collation
  if (!hasFruits) {
    snack.push(
      "Entre 16 h et 18 h : 1 fruit + 7 amandes ou noisettes (≈ 15 g) pour tenir jusqu’au dîner sans craquer sur le sucre ultra-transformé."
    );
    snack.push(
      "Salée express : 150 g tomates cerises + mozzarella 60 g + basilic + 1 c. à c. huile d’olive mesurée sur l’assiette."
    );
  } else {
    snack.push(
      "Goûter demain : yaourt nature + 1 c. à s. purée d’amande complète + cannelle + max 15 g raisins secs (portion sucre maîtrisée)."
    );
    snack.push(
      "Si sport : banane mûre + compote sans sucre ajouté (100 g) environ 45 min avant l’effort pour une montée d’énergie progressive."
    );
  }

  return {
    breakfast: breakfast.slice(0, 2),
    lunch: lunch.slice(0, 2),
    dinner: dinner.slice(0, 2),
    snack: snack.slice(0, 2),
  };
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

