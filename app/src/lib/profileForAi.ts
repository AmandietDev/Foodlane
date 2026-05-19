import { getEffectiveRecipePortions, type PlannerPreferences } from "./weeklyPlanner";
import { getCurrentSeason, getSeasonName } from "./seasonalFilter";

/** Texte structuré pour les prompts IA (menus + scoring recettes) */
export function buildUserProfileForAi(prefs: PlannerPreferences): string {
  const lines: string[] = [];
  const portions = getEffectiveRecipePortions(prefs);
  const season = getCurrentSeason();
  lines.push(`Saison calendaire actuelle (repère menus / catalogue): ${getSeasonName(season)}`);
  lines.push(`Temps de cuisine (préférence): ${prefs.cooking_time_preference}`);
  lines.push(`Niveau en cuisine: ${prefs.cooking_skill_level}`);
  lines.push(
    `Foyer: ${prefs.household_size} personne(s) inscrite(s) (adultes ${prefs.adults_count}, enfants ${prefs.children_count}) ; portions pour ajuster les quantités des recettes et la liste de courses: ${portions}`
  );
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
