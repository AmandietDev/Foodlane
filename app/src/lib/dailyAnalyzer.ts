/**
 * Moteur d'analyse journalière : calcule le score et génère les conseils
 * Le score est la moyenne des repas effectivement saisis (pas de pénalité pour les créneaux vides).
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
    meals_analyzed: number;
  };
}

export interface MealEntry {
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  parsed: ParsedMeal;
  hunger_before?: number;
  satiety_after?: number;
}

export interface UserContext {
  objective?: string;
  allergies?: string[];
  diets?: string[];
  behavioral_preferences?: string[];
}

const FAST_FOOD_TOKENS = ["burger", "frite", "pizza", "kebab", "macdo"];
const MEAT_TOKENS = ["poulet", "viande", "bœuf", "boeuf", "porc", "jambon"];
const VEG_PROTEIN_TOKENS = ["lentilles", "haricots", "tofu", "tempeh"];

const MEAL_LABELS: Record<MealEntry["meal_type"], string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function mealHasFastFood(meal: MealEntry): boolean {
  return meal.parsed.components.treat.some((t) =>
    FAST_FOOD_TOKENS.some((ff) => t.includes(ff))
  );
}

/**
 * Score d'un seul repas saisi (0-100).
 */
export function calculateMealScore(meal: MealEntry, context: UserContext): number {
  const { protein, veggie, carb, fruit } = meal.parsed.components;
  let score = 0;

  const isLightSnack =
    meal.meal_type === "snack" &&
    protein.length === 0 &&
    veggie.length === 0 &&
    carb.length === 0;

  if (isLightSnack) {
    if (fruit.length > 0) score += 85;
    else if (mealHasFastFood(meal)) score += 35;
    else score += 55;
    if (meal.satiety_after !== undefined && meal.satiety_after >= 4) score += 5;
    return clampScore(score);
  }

  if (veggie.length > 0) score += 28;
  if (protein.length > 0) score += 28;
  if (carb.length > 0) score += 18;
  if (fruit.length > 0) score += 12;
  if (!mealHasFastFood(meal)) score += 10;

  if (meal.satiety_after !== undefined && meal.satiety_after >= 4) score += 5;

  if (protein.length === 0 && veggie.length === 0 && carb.length === 0) {
    score = Math.max(15, score - 30);
  }

  if (context.objective === "weight_loss" && veggie.length > 0 && !mealHasFastFood(meal)) {
    score += 8;
  } else if (context.objective === "muscle_gain" && protein.length > 0) {
    score += 8;
  } else if (
    context.objective === "reduce_meat" &&
    protein.length > 0 &&
    protein.every((p) => VEG_PROTEIN_TOKENS.some((v) => p.includes(v)))
  ) {
    score += 8;
  }

  if (context.diets?.includes("vegetarian") || context.diets?.includes("vegan")) {
    const hasMeat = protein.some((p) => MEAT_TOKENS.some((meat) => p.includes(meat)));
    if (!hasMeat) score += 5;
  }

  return clampScore(score);
}

/**
 * Moyenne des scores des repas saisis uniquement.
 */
function calculateScore(meals: MealEntry[], context: UserContext): number {
  if (meals.length === 0) return 0;
  const scores = meals.map((m) => calculateMealScore(m, context));
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(avg);
}

function generateStrengths(meals: MealEntry[], score: number): string[] {
  const strengths: string[] = [];

  for (const meal of meals) {
    const label = MEAL_LABELS[meal.meal_type];
    const { protein, veggie, fruit } = meal.parsed.components;

    if (veggie.length > 0) strengths.push(`${label} : bonne présence de légumes`);
    if (protein.length > 0) strengths.push(`${label} : protéines présentes`);
    if (fruit.length > 0) strengths.push(`${label} : fruit inclus`);
    if (!mealHasFastFood(meal) && (protein.length > 0 || veggie.length > 0)) {
      strengths.push(`${label} : repas équilibré`);
    }
  }

  if (strengths.length === 0 && score >= 50) {
    strengths.push("Tu as commencé à suivre tes repas, c'est une bonne base");
  }
  if (score >= 75 && meals.length > 0) {
    strengths.push("Bonne qualité sur les repas saisis");
  }

  return strengths.slice(0, 3);
}

function generatePriorityTip(meals: MealEntry[], context: UserContext): string {
  if (meals.length === 0) {
    return "Ajoute un repas pour lancer l'analyse de ta journée";
  }

  const ranked = [...meals].sort(
    (a, b) => calculateMealScore(a, context) - calculateMealScore(b, context)
  );
  const weakest = ranked[0];
  const label = MEAL_LABELS[weakest.meal_type];
  const { protein, veggie, carb, fruit } = weakest.parsed.components;

  if (veggie.length === 0 && (weakest.meal_type !== "snack" || protein.length > 0)) {
    return `Pour ton ${label.toLowerCase()}, ajoute une portion de légumes pour augmenter tes fibres`;
  }
  if (protein.length === 0 && weakest.meal_type !== "snack") {
    return `Pour ton ${label.toLowerCase()}, ajoute une source de protéines (œufs, légumineuses, poisson ou viande maigre)`;
  }
  if (carb.length === 0 && (weakest.meal_type === "lunch" || weakest.meal_type === "dinner")) {
    return `Pour ton ${label.toLowerCase()}, une petite portion de féculents complets peut améliorer ta satiété`;
  }
  if (fruit.length === 0 && weakest.meal_type === "breakfast") {
    return `Pour ton ${label.toLowerCase()}, un fruit compléterait bien tes apports en vitamines`;
  }
  if (mealHasFastFood(weakest)) {
    return `Pour ton ${label.toLowerCase()}, une version maison équivalente serait plus nutritive`;
  }

  if (meals.length === 1) {
    return `Ton ${label.toLowerCase()} est noté : enregistre tes autres repas pour suivre toute ta journée`;
  }

  return "Continue à varier tes repas saisis, tu es sur la bonne voie !";
}

function generateTipOptions(meals: MealEntry[], priorityTip: string): string[] {
  const options: string[] = [];
  const hasVeggies = meals.some((m) => m.parsed.components.veggie.length > 0);
  const hasProtein = meals.some((m) => m.parsed.components.protein.length > 0);
  const hasFruits = meals.some((m) => m.parsed.components.fruit.length > 0);

  if (!priorityTip.includes("légumes") && !hasVeggies) {
    options.push("Option 1 : une poignée de crudités en entrée");
    options.push("Option 2 : un légume cuit en accompagnement");
  } else if (!priorityTip.includes("protéines") && !hasProtein) {
    options.push("Option 1 : un œuf au petit-déjeuner");
    options.push("Option 2 : une portion de légumineuses au déjeuner");
  } else if (!priorityTip.includes("fruit") && !hasFruits) {
    options.push("Option 1 : un fruit frais en collation");
    options.push("Option 2 : un fruit au petit-déjeuner");
  } else {
    options.push("Option 1 : varier les couleurs dans ton assiette");
    options.push("Option 2 : inclure une source de fibres à chaque repas saisi");
  }

  return options.slice(0, 2);
}

function generateMissingComponents(meals: MealEntry[]): string[] {
  const missing: string[] = [];

  for (const meal of meals) {
    const label = MEAL_LABELS[meal.meal_type];
    const { protein, veggie, fruit } = meal.parsed.components;

    if (veggie.length === 0 && meal.meal_type !== "snack") {
      missing.push(`légumes au ${label.toLowerCase()}`);
    }
    if (protein.length === 0 && meal.meal_type !== "snack") {
      missing.push(`protéines au ${label.toLowerCase()}`);
    }
    if (fruit.length === 0 && (meal.meal_type === "breakfast" || meal.meal_type === "snack")) {
      missing.push(`fruit au ${label.toLowerCase()}`);
    }
  }

  return [...new Set(missing)].slice(0, 4);
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

export function analyzeDaily(meals: MealEntry[], context: UserContext = {}): DailySummary {
  const score = calculateScore(meals, context);
  const strengths = generateStrengths(meals, score);
  const priorityTip = generatePriorityTip(meals, context);
  const tipOptions = generateTipOptions(meals, priorityTip);
  const planForTomorrow = generatePlanForTomorrow(meals, context);
  const missingComponents = generateMissingComponents(meals);

  const allComponents = meals.flatMap((m) => [
    ...m.parsed.components.protein,
    ...m.parsed.components.veggie,
    ...m.parsed.components.carb,
    ...m.parsed.components.fruit,
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
      rules_triggered: [],
      meals_analyzed: meals.length,
    },
  };
}
