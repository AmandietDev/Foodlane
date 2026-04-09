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

  const { scoreRecipeForPlanner } = await import("./weeklyPlanner");
  const { getCurrentSeason } = await import("./seasonalFilter");
  const season = getCurrentSeason();

  // Étape 1 : score heuristique rapide sur tout le pool filtré (pas de limite de taille)
  const heuristicScored = pool
    .map((r) => ({ recipe: r, score: scoreRecipeForPlanner(r, season, prefs), reason: "" }))
    .sort((a, b) => b.score - a.score);

  if (!openaiKey) {
    const withReason = heuristicScored.map((x) => ({
      ...x,
      reason: "Score heuristique (OPENAI_API_KEY absente)",
    }));
    return { scored: diversifyByType(withReason), usedAi: false };
  }

  // Étape 2 : affinage IA uniquement sur le top 60 (candidats les plus pertinents selon heuristique)
  // Les autres recettes gardent leur score heuristique — évite de perdre le reste du catalogue
  const AI_FINE_TUNE_SIZE = 60;
  const topCandidates = heuristicScored.slice(0, AI_FINE_TUNE_SIZE);
  const restCandidates = heuristicScored.slice(AI_FINE_TUNE_SIZE);

  const compact = topCandidates.map(({ recipe: r }) => ({
    id: r.id,
    nom_recette: r.nom_recette,
    type: r.type,
    difficulte: r.difficulte,
    temps_preparation_min: r.temps_preparation_min,
    ingredients: (r.ingredients || "").slice(0, 300),
    equipements: (r.equipements || "").slice(0, 150),
  }));

  const system = `Tu es un moteur de recommandation de recettes alimentaires expert en nutrition.
Tu reçois le profil complet d’un utilisateur et une liste de recettes candidates.
Tu dois scorer chaque recette de 0 à 100 selon sa pertinence pour cet utilisateur.

Règles absolues :
- Score 0 et exclusion immédiate si la recette contient un allergène déclaré.
- Score 0 si la recette est incompatible avec le régime alimentaire de l’utilisateur.

Critères de scoring (sur 100 au total) :
- Compatibilité intolérances / exclusions : jusqu’à 20 pts
- Respect du temps de préparation disponible : jusqu’à 20 pts
- Adéquation objectif nutritionnel : jusqu’à 20 pts
- Absence d’aliments non aimés : jusqu’à 15 pts
- Compatibilité matériel (équipements) : jusqu’à 15 pts
- Adéquation niveau en cuisine (difficulté recette vs niveau utilisateur) : jusqu’à 10 pts

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
    const aiById = new Map<number, { score: number; reason: string }>();
    for (const row of rows) {
      if (row && row.recipe_id != null) {
        aiById.set(Number(row.recipe_id), {
          score: Math.max(0, Math.min(100, Number(row.score) || 0)),
          reason: String(row.reason || ""),
        });
      }
    }

    // Fusionner : score IA pour les top 60, score heuristique pour le reste
    const aiRefined = topCandidates.map(({ recipe: r, score: hScore }) => {
      const ai = aiById.get(r.id);
      return {
        recipe: r,
        score: ai ? ai.score : hScore,
        reason: ai?.reason || "Score heuristique",
      };
    });
    const restWithReason = restCandidates.map((x) => ({
      ...x,
      reason: "Score heuristique",
    }));

    // Trier le tout par score final et retourner le pool complet
    const fullScored = [...aiRefined, ...restWithReason].sort((a, b) => b.score - a.score);
    const nonZero = fullScored.filter((x) => x.score > 0);
    return { scored: diversifyByType(nonZero.length ? nonZero : fullScored), usedAi: true };
  } catch (e) {
    console.error("[recipePersonalizationAi]", e);
    const fallback = heuristicScored.map((x) => ({
      ...x,
      reason: "Fallback heuristique (erreur IA)",
    }));
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
