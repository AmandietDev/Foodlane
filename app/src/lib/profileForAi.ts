import type { PlannerPreferences } from "./weeklyPlanner";

/** Texte structuré pour les prompts IA (menus + scoring recettes) */
export function buildUserProfileForAi(prefs: PlannerPreferences): string {
  const lines: string[] = [];
  lines.push(`Temps de cuisine (préférence): ${prefs.cooking_time_preference}`);
  lines.push(`Niveau en cuisine: ${prefs.cooking_skill_level}`);
  lines.push(`Personnes: ${prefs.household_size} (adultes ${prefs.adults_count}, enfants ${prefs.children_count})`);
  lines.push(`Jours planifiés: ${prefs.planning_days}`);
  lines.push(`Repas concernés: ${prefs.meal_types.join(", ")}`);
  lines.push(`Structure repas: ${prefs.meal_structure}`);
  lines.push(`Objectifs (liste): ${prefs.objectives.join(", ")}`);
  if (prefs.custom_goal?.trim()) {
    lines.push(`Objectif personnalisé (libre): ${prefs.custom_goal.trim()}`);
  }
  lines.push(`Filtres alimentaires: ${prefs.dietary_filters.join(", ") || "aucun"}`);
  lines.push(`Allergies / mots-clés exclus: ${prefs.allergy_keys.join(", ") || "aucune"}`);
  lines.push(`Ingrédients à éviter: ${prefs.excluded_ingredients.join(", ") || "aucun"}`);
  lines.push(`Équipements: ${prefs.equipment_keys.join(", ")}`);
  lines.push(`Cuisines du monde (mots-clés): ${prefs.world_cuisines.join(", ") || "aucune"}`);
  lines.push(`Privilégier saison: ${prefs.seasonal_preference ? "oui" : "non"}`);
  return lines.join("\n");
}
