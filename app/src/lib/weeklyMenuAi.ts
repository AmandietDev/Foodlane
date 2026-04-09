import type { Recipe } from "./recipes";
import { filterRecipesByEquipment } from "./dietaryProfiles";
import type { PlannedDay, PlannedMeal, PlannedWeek, PlannerPreferences } from "./weeklyPlanner";
import { buildUserProfileForAi } from "./profileForAi";
import {
  buildExclusionList,
  expandEquipmentKeys,
  filterRecipesByMaxPrepTime,
  filterRecipesByStrictExclusions,
  maxMinutesForCookingPreference,
} from "./weeklyPlanner";
import { getCurrentSeason } from "./seasonalFilter";
import { sortMealTypesForDisplay, sortMealsByDisplayOrder } from "./mealOrder";
import {
  addRecipeDominantKeys,
  dominantKeysConflictWithDay,
  recipeDominantProteinKeys,
} from "./proteinVariety";

function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type AiDay = { day_index: number; meals: { meal_type: string; recipe_id: string | number }[] };

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function conflictsWithRecentProteinVariety(recipe: Recipe, recentKeys: Set<string>): boolean {
  if (recentKeys.size === 0) return false;
  const keys = recipeDominantProteinKeys(recipe);
  if (keys.length === 0) return false;
  return keys.some((k) => recentKeys.has(k));
}

/**
 * Génère un plan hebdo via IA (JSON). Retourne null si échec → l’appelant peut utiliser buildWeeklyPlan.
 */
export async function buildWeeklyPlanWithAi(
  recipes: Recipe[],
  prefs: PlannerPreferences,
  weekStartISO: string,
  openaiKey: string
): Promise<PlannedWeek | null> {
  const exclusions = buildExclusionList(prefs);
  let pool = filterRecipesByStrictExclusions(recipes, exclusions);
  pool = filterRecipesByMaxPrepTime(pool, maxMinutesForCookingPreference(prefs.cooking_time_preference));
  if (prefs.equipment_keys.length) {
    pool = filterRecipesByEquipment(pool, expandEquipmentKeys(prefs.equipment_keys));
  }

  if (pool.length === 0) return null;

  const randomizedPool = shuffleArray(pool);
  const byId = new Map(randomizedPool.map((r) => [r.id, r]));
  const catalog = randomizedPool.slice(0, 120).map((r) => ({
    id: r.id,
    nom_recette: r.nom_recette,
    type: r.type,
    temps_preparation_min: r.temps_preparation_min,
    difficulte: r.difficulte,
    ingredients: (r.ingredients || "").slice(0, 300),
  }));

  const carnivoreExplicite =
    prefs.dietary_filters.length === 0 &&
    !prefs.objectives.includes("vegetarien_plus") &&
    !prefs.dietary_filters.includes("vegetarien") &&
    !prefs.dietary_filters.includes("vegan");

  const breakfastPrefFr =
    prefs.breakfast_preference === "sweet"
      ? "UNIQUEMENT sucré (céréales, crêpes, porridge, pain, viennoiserie, fruits)"
      : prefs.breakfast_preference === "savory"
      ? "UNIQUEMENT salé (œufs, toast salé, légumes, fromage)"
      : "sucré ou salé selon la recette";

  const seasonNames: Record<string, string> = {
    printemps: "printemps (mars-mai)",
    ete: "été (juin-août)",
    automne: "automne (septembre-novembre)",
    hiver: "hiver (décembre-février)",
  };
  const currentSeason = getCurrentSeason();
  const seasonLabel = seasonNames[currentSeason] || currentSeason;

  const system = `Tu es un nutritionniste et chef cuisinier expert.
Tu dois générer un plan alimentaire sur N jours pour un utilisateur dont voici le profil.

CONTRAINTES OBLIGATOIRES :
1. Respecter les allergies et intolérances (aucune exception) : n'utiliser QUE des recipe_id de la liste fournie.
2. Maximum 2 repas avec viande rouge (bœuf, porc, agneau, cheval) sur toute la semaine.
3. Minimum 1 repas à base de poisson sur la semaine (sauf si le profil exclut le poisson).
4. Minimum 2 repas végétariens sur la semaine (pas de viande ni poisson), sauf si carnivore explicite.
5. Alterner les sources de protéines d'un jour à l'autre.
6. Ne pas répéter la même protéine dominante sur deux repas le même jour.
7. Adapter les repas à l'objectif santé et au temps de préparation disponible.
8. Assurer un équilibre nutritionnel quotidien (protéines, fibres/légumes, glucides complexes, lipides de qualité).

DIVERSITÉ (CRITIQUE) :
- Ne jamais proposer deux recettes du même type de plat sur la semaine (ex. pas 2 gratins, pas 2 quiches, pas 2 pizzas, pas 2 tartes, pas 2 salades niçoise).
- Varier les méthodes de cuisson : rôti, sauté, mijoté, grillé, vapeur, cru.
- Varier les cuisines : méditerranéenne, asiatique, française, mexicaine, etc.
- Utiliser le maximum de recettes différentes du catalogue — ne jamais réutiliser la même recette deux fois.
- Varier les féculents (riz, pâtes, quinoa, pommes de terre, etc.) au fil de la semaine.

SAISON (IMPORTANT) :
- Nous sommes en ${seasonLabel}. Privilégier fortement les recettes avec des ingrédients de saison.
- Éviter les fruits et légumes hors saison quand des alternatives saisonnières existent dans le catalogue.

PETIT-DÉJEUNER :
- Préférence de l'utilisateur : ${breakfastPrefFr}.
- Choisir des recettes réellement adaptées au petit-déjeuner (pas de plats du soir).

Pour chaque créneau repas, choisir exactement UNE recette par son recipe_id présent dans le catalogue.

Réponds UNIQUEMENT en JSON objet :
{
  "days": [
    {
      "day_index": 0,
      "meals": [
        { "meal_type": "breakfast|lunch|dinner|snack", "recipe_id": "id", "kcal_est": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0 }
      ]
    }
  ]
}

Utilise uniquement les meal_type demandés dans le profil. Nombre de jours = N.`;

  const userPayload = {
    profile_text: buildUserProfileForAi(prefs),
    planning_days: prefs.planning_days,
    meal_types: prefs.meal_types,
    week_start: weekStartISO,
    carnivore_explicite_autorise_moins_vegetarien: carnivoreExplicite,
    catalogue_recettes: catalog,
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Génère le plan JSON pour ce contexte :\n${JSON.stringify(userPayload)}`,
          },
        ],
      }),
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as { days?: AiDay[] };
    const daysIn = Array.isArray(parsed.days) ? parsed.days : [];
    if (daysIn.length === 0) return null;

    const days: PlannedDay[] = [];
    const used = new Set<number>();

    let previousDayDominant = new Set<string>();
    for (let d = 0; d < prefs.planning_days; d++) {
      const src = daysIn.find((x) => x.day_index === d) || daysIn[d];
      const meals: PlannedMeal[] = [];
      const slots = sortMealTypesForDisplay(prefs.meal_types);
      const dayDominant = new Set<string>();

      for (const mt of slots) {
        const m = src?.meals?.find((x) => x.meal_type === mt);
        let recipe: Recipe | undefined;

        const aiRecipeId = Number(m?.recipe_id);
        if (Number.isFinite(aiRecipeId) && byId.has(aiRecipeId)) {
          const r0 = byId.get(aiRecipeId)!;
          if (!dominantKeysConflictWithDay(r0, dayDominant)) {
            recipe = r0;
          }
        }

        if (!recipe) {
          const candidates = randomizedPool.filter((r) => !used.has(r.id));
          recipe =
            candidates.find((r) => {
              if (dominantKeysConflictWithDay(r, dayDominant)) return false;
              if (
                (mt === "lunch" || mt === "dinner") &&
                conflictsWithRecentProteinVariety(r, previousDayDominant)
              ) {
                return false;
              }
              return true;
            }) || candidates[0];
        }

        if (!recipe) {
          recipe =
            randomizedPool.find((r) => !used.has(r.id)) ||
            randomizedPool[Math.floor(Math.random() * randomizedPool.length)];
        }

        if (!recipe) continue;
        used.add(recipe.id);
        addRecipeDominantKeys(recipe, dayDominant);
        meals.push({
          meal_type: mt,
          recipe_id: recipe.id,
          recipe_name: recipe.nom_recette || "Recette",
          recipe_payload: recipe,
        });
      }

      days.push({
        day_index: d,
        day_date: addDaysISO(weekStartISO, d),
        meals: sortMealsByDisplayOrder(meals),
      });
      previousDayDominant = new Set(dayDominant);
    }

    const season = getCurrentSeason();
    return {
      days,
      meta: {
        season,
        recipes_considered: recipes.length,
        recipes_after_filters: pool.length,
      },
    };
  } catch (e) {
    console.error("[weeklyMenuAi]", e);
    return null;
  }
}
