/** Clés stables pour équipements (stockées en base + envoyées à l’API) */
export const EQUIPMENT_OPTIONS = [
  { key: "four", label: "Four" },
  { key: "micro_ondes", label: "Micro-ondes" },
  { key: "plaque_cuisson", label: "Plaques de cuisson" },
  { key: "airfryer", label: "Air fryer" },
  { key: "blender", label: "Blender" },
  { key: "robot_cuiseur", label: "Robot / cuiseur" },
  { key: "autocuiseur", label: "Autocuiseur" },
  { key: "barbecue", label: "Barbecue" },
  { key: "congelateur", label: "Congélateur" },
  { key: "refrigerateur", label: "Réfrigérateur" },
] as const;

export type EquipmentKey = (typeof EQUIPMENT_OPTIONS)[number]["key"];

export const COOKING_TIME_OPTIONS = [
  { key: "moins_15", label: "Moins de 15 min", maxMinutes: 15 },
  { key: "15_30", label: "15 à 30 min", maxMinutes: 30 },
  { key: "30_45", label: "30 à 45 min", maxMinutes: 45 },
  { key: "45_plus", label: "45 min et plus", maxMinutes: 999 },
] as const;

export type CookingTimeKey = (typeof COOKING_TIME_OPTIONS)[number]["key"];

export const COOKING_SKILL_OPTIONS = [
  { key: "debutant", label: "Débutant" },
  { key: "intermediaire", label: "Intermédiaire" },
  { key: "confirme", label: "Confirmé" },
] as const;

export type CookingSkillLevel = (typeof COOKING_SKILL_OPTIONS)[number]["key"];

export const OBJECTIVE_OPTIONS = [
  { key: "mieux_manger", label: "Mieux manger au quotidien" },
  { key: "gain_temps", label: "Gagner du temps" },
  { key: "perte_poids", label: "Perte de poids" },
  { key: "prise_masse", label: "Prise de masse" },
  { key: "equilibre", label: "Alimentation plus équilibrée" },
  { key: "famille", label: "Cuisiner pour la famille" },
  { key: "batch", label: "Batch cooking / organisation" },
  { key: "vegetarien_plus", label: "Manger végétarien plus souvent" },
  { key: "charge_mentale", label: "Réduire la charge mentale" },
  { key: "autre", label: "Autre" },
] as const;

export const DIETARY_FILTER_OPTIONS = [
  { key: "vegetarien", label: "Végétarien" },
  { key: "vegan", label: "Végétalien / vegan" },
  { key: "pescetarien", label: "Pescétarien" },
  { key: "flexitarien", label: "Flexitarien" },
  { key: "sans_gluten", label: "Sans gluten" },
  { key: "sans_lactose", label: "Sans lactose" },
  { key: "sans_porc", label: "Sans porc" },
  { key: "sans_fruits_coque", label: "Sans fruits à coque" },
  { key: "sans_arachides", label: "Sans arachides" },
  { key: "sans_oeufs", label: "Sans œufs" },
  { key: "sans_soja", label: "Sans soja" },
  { key: "sans_poisson", label: "Sans poisson" },
  { key: "sans_crustaces", label: "Sans crustacés" },
] as const;

export type DietaryFilterKey = (typeof DIETARY_FILTER_OPTIONS)[number]["key"];

export const MEAL_TYPE_OPTIONS = [
  { key: "breakfast", label: "Petit-déjeuner" },
  { key: "lunch", label: "Déjeuner" },
  { key: "dinner", label: "Dîner" },
  { key: "snack", label: "Collation" },
] as const;

export type PlannerMealType = (typeof MEAL_TYPE_OPTIONS)[number]["key"];

export const MEAL_STRUCTURE_OPTIONS = [
  { key: "entree_plat_dessert", label: "Entrée + plat + dessert" },
  { key: "entree_plat", label: "Entrée + plat" },
  { key: "plat_dessert", label: "Plat + dessert" },
  { key: "plat_seul", label: "Plat seul" },
] as const;

export type MealStructureKey = (typeof MEAL_STRUCTURE_OPTIONS)[number]["key"];

/** Synonymes français pour matcher le champ `equipements` des recettes */
export const EQUIPMENT_KEY_SYNONYMS: Record<string, string[]> = {
  four: ["four"],
  micro_ondes: ["micro", "micro-ondes", "micro ondes"],
  plaque_cuisson: ["plaque", "feu", "casserole", "poêle", "poele", "cuisinière", "cuisiniere"],
  airfryer: ["air fryer", "friteuse", "sans huile"],
  blender: ["blender", "mixeur"],
  robot_cuiseur: ["thermomix", "robot", "companion", "cookéo", "cookeo"],
  autocuiseur: ["autocuiseur", "cocotte minute", "instant pot"],
  barbecue: ["barbecue", "bbq", "grill"],
  congelateur: ["congelateur", "congélateur", "surgelé", "surgele"],
  refrigerateur: ["réfrigérateur", "refrigerateur", "frigo"],
};
