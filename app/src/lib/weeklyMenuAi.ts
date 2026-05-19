import type { Recipe } from "./recipes";
import type { LockedSlot, PlannedDay, PlannedMeal, PlannedWeek, PlannerPreferences } from "./weeklyPlanner";
import { buildUserProfileForAi } from "./profileForAi";
import {
  buildExclusionList,
  filterRecipesByMaxPrepTime,
  filterRecipesByStrictExclusions,
  finalizeIncompleteWeeklyPlan,
  maxMinutesForCookingPreference,
  scoreRecipeForPlanner,
} from "./weeklyPlanner";
import { filterRecipesForSeasonalPool, getCurrentSeason } from "./seasonalFilter";
import { sortMealTypesForDisplay, sortMealsByDisplayOrder } from "./mealOrder";
import type { Locale } from "./i18n";
import { aiOutputLanguageDirective } from "./aiLocale";
import {
  addRecipeDominantKeys,
  dominantKeysConflictWithDay,
  recipeDominantProteinKeys,
} from "./proteinVariety";
import { isRecipeCompatibleWithMealType } from "./mealCompatibility";
import {
  addRecipeDiversityTags,
  wouldExceedWeekDiversityCap,
} from "./recipeDiversity";
import { rerankWithMMR } from "./mmrRanking";
import { filterRecipesByStructuredDietaryRules } from "./dietaryStructured";
import { getMainProtein, getMainCarb, getDishType } from "./recipeFields";

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
  openaiKey: string,
  locale: Locale = "fr",
  recentlyUsed?: Map<number, number>,
  recentFamilyCounts?: Map<string, number>,
  lockedMeals?: LockedSlot[]
): Promise<PlannedWeek | null> {
  const exclusions = buildExclusionList(prefs);

  // Filtres durs :
  //  1. Règles diététiques structurées (allergens / diet_tags / main_protein)
  //  2. Regex legacy sur ingredients
  // ⚠️ Pas de filtre équipement strict (voir commentaire dans buildWeeklyPlan).
  let pool = filterRecipesByStructuredDietaryRules(
    recipes,
    prefs.dietary_filters,
    prefs.allergy_keys
  );
  pool = filterRecipesByStrictExclusions(pool, exclusions);

  const season = getCurrentSeason();

  // Filtre saisonnier DUR : seules les recettes de la saison courante,
  // "toute l'année" ou sans tag saison entrent dans le pool.
  const safePool = prefs.seasonal_preference
    ? filterRecipesForSeasonalPool(pool, season)
    : pool;
  const seasonPool = safePool.length > 0 ? safePool : pool;

  if (seasonPool.length === 0) return null;

  // ── Exclusion `recentlyUsed` PAR CRÉNEAU (cf. weeklyPlanner.ts) ────────
  const recentIds = recentlyUsed ? new Set(recentlyUsed.keys()) : new Set<number>();
  const workingPool: Recipe[] = (() => {
    if (recentIds.size === 0) return seasonPool;
    const result = new Set<Recipe>();
    for (const mealType of prefs.meal_types) {
      const compatibleAll = seasonPool.filter((r) =>
        isRecipeCompatibleWithMealType(r, mealType)
      );
      const fresh = compatibleAll.filter((r) => !recentIds.has(r.id));
      const threshold = prefs.planning_days * 3;
      const chosen = fresh.length >= threshold ? fresh : compatibleAll;
      for (const r of chosen) result.add(r);
    }
    return Array.from(result);
  })();

  console.log(
    `[weeklyMenuAi] Pools : recipes=${recipes.length} ` +
      `pool=${pool.length} seasonPool=${seasonPool.length} ` +
      `recentlyUsed=${recentIds.size} working=${workingPool.length}`
  );
  const perMealAi: Record<string, number> = {};
  for (const mt of prefs.meal_types) {
    perMealAi[mt] = workingPool.filter((r) => isRecipeCompatibleWithMealType(r, mt)).length;
  }
  console.log(`[weeklyMenuAi] Compatibles par créneau dans workingPool :`, perMealAi);

  // Score le pool de travail avec pénalité graduelle pour les recettes récentes.
  const scoredPoolRaw = workingPool
    .map((r) => {
      let score = scoreRecipeForPlanner(r, season, prefs, recentFamilyCounts);
      if (recentlyUsed) {
        const menusAgo = recentlyUsed.get(r.id);
        if (menusAgo === 0) score = Math.max(0, score - 60);
        else if (menusAgo === 1) score = Math.max(0, score - 35);
        else if (menusAgo === 2) score = Math.max(0, score - 20);
        else if (menusAgo === 3) score = Math.max(0, score - 10);
        else if (menusAgo === 4) score = Math.max(0, score - 5);
      }
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);
  const scoredPool = rerankWithMMR(
    scoredPoolRaw.map(({ r, score }) => ({ r, s: score })),
    0.72
  ).map(({ r, s }) => ({ r, score: s }));

  // Catalogue IA : sélection pondérée par score + forte randomisation.
  // L'IA ne voit que des recettes fraîches (non utilisées récemment si possible).
  const CATALOG_SIZE = 500;
  const stratifiedSample = scoredPool.length <= CATALOG_SIZE
    ? scoredPool
    : scoredPool
        .map(({ r, score }) => ({ r, score, key: Math.random() * Math.max(1, score) }))
        .sort((a, b) => b.key - a.key)
        .slice(0, CATALOG_SIZE)
        .map(({ r, score }) => ({ r, score }));

  const randomizedPool = shuffleArray(workingPool); // fallback de remplissage sur le pool frais
  const byId = new Map(seasonPool.map((r) => [r.id, r])); // lookup complet pour l'IA
  const scoreById = new Map(scoredPool.map(({ r, score }) => [r.id, score]));
  // Mélanger le catalogue : l'IA ne doit pas toujours voir les mêmes recettes en premier
  const shuffledSample = shuffleArray(stratifiedSample);
  // Catalogue enrichi : on expose à l'IA les colonnes structurées pour qu'elle
  // puisse raisonner sur meal_slot, protéine, féculent, dish_type, etc.
  const catalog = shuffledSample.map(({ r }) => ({
    id: r.id,
    nom_recette: r.nom_recette,
    type: r.type,
    temps_preparation_min: r.temps_preparation_min,
    difficulte: r.difficulte,
    saison: r.saison ?? null,
    meal_slot: r.meal_slot ?? null,
    dish_type: r.dish_type ?? null,
    main_protein: getMainProtein(r) || null,
    main_carb: getMainCarb(r) || null,
    main_vegetables: r.main_vegetables ?? null,
    diet_tags: r.diet_tags ?? null,
    ingredients: (r.ingredients || "").slice(0, 160),
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
    été: "été (juin-août)",
    automne: "automne (septembre-novembre)",
    hiver: "hiver (décembre-février)",
  };
  const currentSeason = season; // déjà calculé plus haut
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

DIVERSITÉ (CRITIQUE — utilise les colonnes structurées) :
- Maximum 2 recettes avec le MÊME "main_protein" sur toute la semaine.
- Maximum 2 recettes avec le MÊME "main_carb" sur toute la semaine.
- Maximum 2 recettes avec le MÊME "dish_type" sur toute la semaine.
- Ne jamais répéter le même "main_protein" sur deux repas le même jour.
- Alterner les "cooking_method" et les "dish_type" sur des jours consécutifs.
- Utiliser le maximum de recettes différentes du catalogue — ne jamais réutiliser la même recette deux fois.

COMPATIBILITÉ CRÉNEAU (CRITIQUE) :
- Chaque recette possède un champ "meal_slot" (ex. "petit_dejeuner|dejeuner|diner").
- Tu DOIS choisir une recette dont "meal_slot" contient le créneau cible :
   • breakfast → "petit_dejeuner" ou "brunch"
   • lunch     → "dejeuner" ou "plat principal"
   • dinner    → "diner" ou "plat principal"
   • snack     → "collation", "gouter" ou "dessert"
- Interdit : soupe / smoothie / boisson en petit-déjeuner (sauf si meal_slot contient "petit_dejeuner")
- Interdit : pur dessert sucré (gâteau, smoothie, tarte sucrée) en dîner.

ANTI-RÉPÉTITION (IMPORTANT) :
- Toutes les recettes du catalogue sont fraîches (non utilisées dans les menus récents).
- Utilise le maximum de recettes différentes — ne jamais réutiliser la même recette deux fois dans la semaine.

SAISON (IMPORTANT) :
- Nous sommes en ${seasonLabel}.
- Chaque recette du catalogue possède un champ "saison" indiquant sa pertinence saisonnière.
- Privilégie fortement les recettes dont "saison" correspond à "${currentSeason}" ou à "toute l'année".
- Évite les recettes dont "saison" ne correspond pas à la saison actuelle, sauf si aucune alternative n'existe.
- Les recettes sans champ "saison" peuvent être utilisées mais restent moins prioritaires que celles bien étiquetées.

PETIT-DÉJEUNER :
- Préférence de l'utilisateur : ${breakfastPrefFr}.
- Choisir des recettes réellement adaptées au petit-déjeuner (pas de plats du soir).

STRUCTURE OBLIGATOIRE DU JSON :
- Le tableau "days" doit contenir EXACTEMENT ${prefs.planning_days} entrées, une par jour, avec "day_index" allant de 0 à ${prefs.planning_days - 1} dans l’ordre.
- Chaque jour doit avoir EXACTEMENT ${prefs.meal_types.length} repas, un par créneau : ${prefs.meal_types.join(", ")} (champ "meal_type" identique à ces valeurs).
- Pour chaque créneau repas, choisir exactement UNE recette par son recipe_id présent dans le catalogue.
- Évite au maximum les doublons de recipe_id sur la semaine (objectif: 0 doublon). N'autorise un doublon que s'il n'existe réellement aucune alternative compatible.

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

Utilise uniquement les meal_type demandés dans le profil. Nombre de jours = N.

${aiOutputLanguageDirective(locale)}
Les noms de recettes du catalogue (nom_recette) restent tels quels ; ne les traduis pas dans le JSON.`;

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
    const usageCount = new Map<number, number>();
    const weekTagCounts = new Map<string, number>();
    const totalSlots = prefs.planning_days * prefs.meal_types.length;

    // Index des slots verrouillés par jour
    const lockedByDay = new Map<number, Map<string, PlannedMeal>>();
    for (const lm of lockedMeals || []) {
      if (!lockedByDay.has(lm.day_index)) lockedByDay.set(lm.day_index, new Map());
      lockedByDay.get(lm.day_index)!.set(lm.meal_type, {
        meal_type: lm.meal_type as (typeof prefs.meal_types)[number],
        recipe_id: lm.recipe_id,
        recipe_name: lm.recipe_payload.nom_recette || "Recette",
        recipe_payload: lm.recipe_payload as Recipe,
      });
    }

    let previousDayDominant = new Set<string>();
    for (let d = 0; d < prefs.planning_days; d++) {
      const src = daysIn.find((x) => x.day_index === d) || daysIn[d];
      const meals: PlannedMeal[] = [];
      const slots = sortMealTypesForDisplay(prefs.meal_types);
      const dayDominant = new Set<string>();

      // Pré-remplissage des slots verrouillés
      const dayLocked = lockedByDay.get(d);
      if (dayLocked) {
        for (const [mt, lm] of dayLocked) {
          if (!slots.includes(mt as (typeof prefs.meal_types)[number])) continue;
          used.add(lm.recipe_id);
          usageCount.set(lm.recipe_id, (usageCount.get(lm.recipe_id) || 0) + 1);
          addRecipeDominantKeys(lm.recipe_payload as Recipe, dayDominant);
          addRecipeDiversityTags(lm.recipe_payload as Recipe, weekTagCounts);
          meals.push(lm);
        }
      }

      for (const mt of slots) {
        // Slot déjà rempli par un verrou → on passe
        if (meals.some((m) => m.meal_type === mt)) continue;
        const m = src?.meals?.find((x) => x.meal_type === mt);
        let recipe: Recipe | undefined;

        const aiRecipeId = Number(m?.recipe_id);
        if (Number.isFinite(aiRecipeId) && byId.has(aiRecipeId)) {
          const r0 = byId.get(aiRecipeId)!;
          if (
            !used.has(r0.id) &&
            isRecipeCompatibleWithMealType(r0, mt) &&
            !dominantKeysConflictWithDay(r0, dayDominant) &&
            !wouldExceedWeekDiversityCap(r0, weekTagCounts, totalSlots)
          ) {
            recipe = r0;
          }
        }

        if (!recipe) {
          // Fallback unifié : toujours préférer une recette unique.
          // Contrainte dure = unicité + compatibilité type de repas.
          // Tout le reste (protéines, dominance, diversité) = pénalités douces seulement.
          const uniqueCandidates = randomizedPool.filter(
            (r) => !used.has(r.id) && isRecipeCompatibleWithMealType(r, mt)
          );
          if (uniqueCandidates.length > 0) {
            const ranked = uniqueCandidates
              .map((r) => ({
                r,
                adjusted:
                  (scoreById.get(r.id) || 0) +
                  (!dominantKeysConflictWithDay(r, dayDominant) ? 10 : 0) +
                  (!wouldExceedWeekDiversityCap(r, weekTagCounts, totalSlots) ? 8 : 0) +
                  (!conflictsWithRecentProteinVariety(r, previousDayDominant) ? 6 : 0) -
                  (usageCount.get(r.id) || 0) * 24 +
                  Math.random() * 8,
              }))
              .sort((a, b) => b.adjusted - a.adjusted);
            recipe = ranked[0].r;
          }
        }

        if (!recipe) {
          // Dernier recours : compatibilité créneau est ABSOLUE. On préfère
          // une réutilisation d'une recette adaptée plutôt qu'un mauvais matching.
          const fallbackPool = safePool.length > 0 ? safePool : pool;
          const compatibleFallback = fallbackPool.filter((r) =>
            isRecipeCompatibleWithMealType(r, mt)
          );
          if (compatibleFallback.length > 0) {
            const ranked = compatibleFallback
              .map((r) => ({
                r,
                adjusted:
                  (!used.has(r.id) ? 100 : 0) +
                  (scoreById.get(r.id) || 30) -
                  (usageCount.get(r.id) || 0) * 22 +
                  Math.random() * 4,
              }))
              .sort((a, b) => b.adjusted - a.adjusted);
            recipe = ranked[0]?.r;
          } else {
            console.warn(
              `[weeklyMenuAi] Aucune recette compatible "${mt}" — slot laissé vide. ` +
                `Recommandation : enrichir meal_slot dans recipes_v2.`
            );
          }
        }
        if (!recipe) continue;
        used.add(recipe.id);
        usageCount.set(recipe.id, (usageCount.get(recipe.id) || 0) + 1);
        addRecipeDominantKeys(recipe, dayDominant);
        addRecipeDiversityTags(recipe, weekTagCounts);
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

    const scoredForFinalize = scoredPool.map(({ r, score }) => ({ r, s: score }));
    // Pool de secours pour le finalize : pool après filtres durs (diététique,
    // exclusions, équipement) mais SANS saisonnier ni recentlyUsed. Utilisé en
    // ultime recours pour éviter les slots vides faute de candidats compatibles.
    return finalizeIncompleteWeeklyPlan(
      {
        days,
        meta: {
          season,
          recipes_considered: recipes.length,
          recipes_after_filters: pool.length,
        },
      },
      prefs,
      weekStartISO,
      scoredForFinalize,
      pool
    );
  } catch (e) {
    console.error("[weeklyMenuAi]", e);
    return null;
  }
}
