/**
 * Clés stables pour équipements (stockées en base + envoyées à l’API).
 *
 * ⚠️ Liste BLANCHE : on ne propose à l'utilisateur QUE des équipements
 * discriminants — ceux qu'un foyer peut légitimement ne pas posséder et
 * qui bloquent vraiment certaines recettes. Les ustensiles évidents
 * (couteau, planche, casserole, fouet, moule à gâteau...) sont volontairement
 * absents : tout le monde les a, les inclure ne servirait qu'à polluer.
 */
export const EQUIPMENT_OPTIONS = [
  // ── Indispensables (cocher pour la quasi-totalité des utilisateurs) ─
  { key: "four", label: "Four" },
  { key: "micro_ondes", label: "Micro-ondes" },
  { key: "plaque_cuisson", label: "Plaques de cuisson" },
  { key: "refrigerateur", label: "Réfrigérateur" },
  { key: "congelateur", label: "Congélateur" },
  // ── Petit électroménager courant ────────────────────────────────────
  { key: "blender", label: "Blender / mixeur" },
  { key: "robot_cuiseur", label: "Robot cuiseur (Thermomix, Cookeo…)" },
  { key: "airfryer", label: "Air fryer" },
  { key: "autocuiseur", label: "Autocuiseur / cocotte-minute" },
  // ── Spécialisés (vraiment optionnels) ───────────────────────────────
  { key: "cuiseur_vapeur", label: "Cuiseur vapeur" },
  { key: "gaufrier", label: "Gaufrier" },
  { key: "yaourtiere", label: "Yaourtière" },
  { key: "machine_a_pain", label: "Machine à pain" },
  { key: "spiraliseur", label: "Spiraliseur" },
  { key: "barbecue", label: "Barbecue / plancha" },
] as const;

export type EquipmentKey = (typeof EQUIPMENT_OPTIONS)[number]["key"];

export const COOKING_TIME_OPTIONS = [
  { key: "moins_15", label: "Moins de 15 min", maxMinutes: 15 },
  { key: "15_30", label: "15 à 30 min", maxMinutes: 30 },
  { key: "30_45", label: "30 à 45 min", maxMinutes: 45 },
  { key: "45_plus", label: "45 min et plus", maxMinutes: 999 },
  { key: "peu_importe", label: "Peu importe", maxMinutes: 9999 },
] as const;

export type CookingTimeKey = (typeof COOKING_TIME_OPTIONS)[number]["key"];

export const BREAKFAST_PREFERENCE_OPTIONS = [
  { key: "sweet", label: "🍯 Sucré" },
  { key: "savory", label: "🥚 Salé" },
  { key: "both", label: "🌅 Peu importe" },
] as const;

export type BreakfastPreferenceKey = (typeof BREAKFAST_PREFERENCE_OPTIONS)[number]["key"];

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

/**
 * Structures de repas proposées dans l'UI.
 * Volontairement réduit à "plat_seul" : les structures à plusieurs services
 * (entrée + plat, plat + dessert, etc.) ne sont plus exposées car elles
 * créaient une charge cognitive sans bénéfice pratique.
 */
export const MEAL_STRUCTURE_OPTIONS = [
  { key: "plat_seul", label: "Plat seul" },
] as const;

export type MealStructureKey = (typeof MEAL_STRUCTURE_OPTIONS)[number]["key"];

/** Synonymes français pour matcher le champ `equipements` des recettes */
export const EQUIPMENT_KEY_SYNONYMS: Record<string, string[]> = {
  four: ["four"],
  micro_ondes: ["micro", "micro-ondes", "micro ondes", "micro_ondes"],
  plaque_cuisson: ["plaque", "feu", "cuisinière", "cuisiniere", "induction", "gaz"],
  airfryer: ["air fryer", "airfryer", "friteuse", "sans huile"],
  blender: ["blender", "mixeur"],
  robot_cuiseur: ["thermomix", "robot", "companion", "cookéo", "cookeo", "robot_cuiseur"],
  autocuiseur: ["autocuiseur", "cocotte minute", "cocotte-minute", "instant pot"],
  barbecue: ["barbecue", "bbq", "grill", "plancha"],
  congelateur: ["congelateur", "congélateur", "surgelé", "surgele"],
  refrigerateur: ["réfrigérateur", "refrigerateur", "frigo"],
  gaufrier: ["gaufrier"],
  yaourtiere: ["yaourtiere", "yaourtière"],
  machine_a_pain: ["machine à pain", "machine a pain", "map"],
  cuiseur_vapeur: ["cuiseur vapeur", "cuiseur_vapeur", "panier vapeur"],
  spiraliseur: ["spiraliseur", "spiralizer"],
};
