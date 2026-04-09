import type { Recipe } from "./recipes";
import { filterRecipesByEquipment } from "./dietaryProfiles";
import type { PlannerPreferences } from "./weeklyPlanner";
import {
  buildExclusionList,
  expandEquipmentKeys,
  filterRecipesByMaxPrepTime,
  filterRecipesByStrictExclusions,
  maxMinutesForCookingPreference,
} from "./weeklyPlanner";
import { buildUserProfileForAi } from "./profileForAi";

export type RecipeScoreRow = { recipe_id: string; score: number; reason: string };

/**
 * Filtre dur (allergènes / régime) puis scoring IA 0–100.
 */
export async function scoreRecipesForUserProfile(
  recipes: Recipe[],
  prefs: PlannerPreferences,
  openaiKey: string | undefined
): Promise<{ scored: { recipe: Recipe; score: number; reason: string }[]; usedAi: boolean }> {
  const exclusions = buildExclusionList(prefs);
  let pool = filterRecipesByStrictExclusions(recipes, exclusions);
  pool = filterRecipesByMaxPrepTime(pool, maxMinutesForCookingPreference(prefs.cooking_time_preference));
  if (prefs.equipment_keys.length) {
    pool = filterRecipesByEquipment(pool, expandEquipmentKeys(prefs.equipment_keys));
  }

  if (pool.length === 0) {
    return { scored: [], usedAi: false };
  }

  if (!openaiKey) {
    const { scoreRecipeForPlanner } = await import("./weeklyPlanner");
    const { getCurrentSeason } = await import("./seasonalFilter");
    const season = getCurrentSeason();
    const fallback = pool.map((r) => ({
      recipe: r,
      score: scoreRecipeForPlanner(r, season, prefs),
      reason: "Score heuristique (OPENAI_API_KEY absente)",
    }));
    fallback.sort((a, b) => b.score - a.score);
    return { scored: diversifyByType(fallback), usedAi: false };
  }

  const compact = pool.slice(0, 80).map((r) => ({
    id: r.id,
    nom_recette: r.nom_recette,
    type: r.type,
    difficulte: r.difficulte,
    temps_preparation_min: r.temps_preparation_min,
    ingredients: (r.ingredients || "").slice(0, 400),
    equipements: (r.equipements || "").slice(0, 200),
  }));

  const system = `Tu es un moteur de recommandation de recettes alimentaires expert en nutrition.
Tu reçois le profil complet d'un utilisateur et une liste de recettes candidates.
Tu dois scorer chaque recette de 0 à 100 selon sa pertinence pour cet utilisateur.

Règles absolues :
- Score 0 et exclusion immédiate si la recette contient un allergène déclaré.
- Score 0 si la recette est incompatible avec le régime alimentaire de l'utilisateur.

Critères de scoring (sur 100 au total) :
- Compatibilité intolérances / exclusions : jusqu'à 20 pts
- Respect du temps de préparation disponible : jusqu'à 20 pts
- Adéquation objectif nutritionnel : jusqu'à 20 pts
- Absence d'aliments non aimés : jusqu'à 15 pts
- Compatibilité matériel (équipements) : jusqu'à 15 pts
- Adéquation niveau en cuisine (difficulté recette vs niveau utilisateur) : jusqu'à 10 pts

Réponds UNIQUEMENT en JSON valide : un tableau [{"recipe_id":"...","score":85,"reason":"..."}, ...]
Inclure une entrée pour CHAQUE recette candidate fournie (même score 0 si exclue).`;

  const userMsg = `PROFIL UTILISATEUR:\n${buildUserProfileForAi(prefs)}\n\nRECETTES (JSON):\n${JSON.stringify(compact)}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `${userMsg}\nRéponds avec un objet JSON : {"scores": [...] } où scores est le tableau demandé.`,
          },
        ],
      }),
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Pas de réponse IA");

    const parsed = JSON.parse(text) as { scores?: RecipeScoreRow[] };
    const rows: RecipeScoreRow[] = Array.isArray(parsed.scores) ? parsed.scores : [];
    const byId = new Map<number, { score: number; reason: string }>();
    for (const row of rows) {
      if (row && row.recipe_id != null) {
        byId.set(Number(row.recipe_id), {
          score: Math.max(0, Math.min(100, Number(row.score) || 0)),
          reason: String(row.reason || ""),
        });
      }
    }

    const scored = pool.map((r) => {
      const s = byId.get(r.id);
      return {
        recipe: r,
        score: s?.score ?? 50,
        reason: s?.reason || "Non notée par l’IA",
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const nonZero = scored.filter((x) => x.score > 0);
    const finalList = nonZero.length ? nonZero : scored;
    return { scored: diversifyByType(finalList), usedAi: true };
  } catch (e) {
    console.error("[recipePersonalizationAi]", e);
    const { scoreRecipeForPlanner } = await import("./weeklyPlanner");
    const { getCurrentSeason } = await import("./seasonalFilter");
    const season = getCurrentSeason();
    const fallback = pool.map((r) => ({
      recipe: r,
      score: scoreRecipeForPlanner(r, season, prefs),
      reason: "Fallback heuristique (erreur IA)",
    }));
    fallback.sort((a, b) => b.score - a.score);
    return { scored: diversifyByType(fallback), usedAi: false };
  }
}

function diversifyByType(
  sorted: { recipe: Recipe; score: number; reason: string }[]
): { recipe: Recipe; score: number; reason: string }[] {
  const result: { recipe: Recipe; score: number; reason: string }[] = [];
  const buckets = new Map<string, { recipe: Recipe; score: number; reason: string }[]>();
  for (const item of sorted) {
    const key = (item.recipe.type || "autre").toLowerCase().slice(0, 24);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  }
  let round = 0;
  while (result.length < sorted.length) {
    let added = false;
    for (const [, arr] of buckets) {
      if (arr[round]) {
        result.push(arr[round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return result;
}
