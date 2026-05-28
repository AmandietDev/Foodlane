import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { getCachedRecipes } from "../../../src/lib/recipesServerCache";
import { scoreRecipesForUserProfile } from "../../../src/lib/recipePersonalizationAi";
import { DEFAULT_PLANNER_PREFERENCES } from "../../../src/lib/weeklyPlanner";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../src/lib/plannerServer";
import type { PlannerPreferences } from "../../../src/lib/weeklyPlanner";
import { FREE_RECIPES_FOR_ME_AI_PER_WEEK } from "../../../src/lib/freemiumLimits";
import { tryConsumeFreemiumQuota, weekPeriodKey } from "../../../src/lib/usageQuotasServer";

export const dynamic = "force-dynamic";

type CachedResult = { at: number; data: object };
const userResultsCache = new Map<string, CachedResult>();
const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const USER_CACHE_MAX_SIZE = 200;

export function clearForMeCache(): void {
  userResultsCache.clear();
}

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const t0 = Date.now();
  const skipUserCache = process.env.DISABLE_RECIPE_SERVER_CACHE === "true";
  const cached = !skipUserCache && userResultsCache.get(userId);
  if (cached && Date.now() - cached.at < USER_CACHE_TTL_MS) {
    console.log(`[for-me] HIT user cache (age ${Math.round((Date.now() - cached.at) / 1000)}s)`);
    return NextResponse.json(cached.data);
  }

  const { data: row } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let prefs: PlannerPreferences = DEFAULT_PLANNER_PREFERENCES;
  if (row) {
    const [{ data: equipment }, { data: allergies }, { data: excluded }] = await Promise.all([
      supabaseAdmin.from("user_equipment").select("equipment_key").eq("user_id", userId),
      supabaseAdmin.from("user_allergies").select("allergy_key").eq("user_id", userId),
      supabaseAdmin.from("user_excluded_ingredients").select("ingredient_name").eq("user_id", userId),
    ]);
    prefs = rowToPlannerPreferences(
      row as UserPreferencesRow,
      equipment || [],
      allergies || [],
      excluded || []
    );
  }

  // Use the shared 30-min server cache instead of fetching from Supabase on every request
  const recipes = await getCachedRecipes();

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const aiQuota = await tryConsumeFreemiumQuota(
      userId,
      "recipes_for_me_ai",
      weekPeriodKey(),
      FREE_RECIPES_FOR_ME_AI_PER_WEEK
    );
    if (!aiQuota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          metric: "recipes_for_me_ai",
          limit: aiQuota.limit,
          count: aiQuota.count,
          message:
            "Tu as atteint la limite d'affinage IA « recettes pour moi » pour cette semaine sur le plan gratuit.",
        },
        { status: 403 }
      );
    }
  }

  const { scored, usedAi } = await scoreRecipesForUserProfile(recipes, prefs, openaiKey);

  const out = scored.map((s) => ({
    ...s.recipe,
    personalization_score: s.score,
    personalization_reason: s.reason,
  }));

  const result = { recipes: out, used_ai: usedAi, count: out.length };
  console.log(`[for-me] MISS → ${out.length} recettes scorées en ${Date.now() - t0}ms`);

  if (!skipUserCache) {
    if (userResultsCache.size >= USER_CACHE_MAX_SIZE) {
      userResultsCache.delete(userResultsCache.keys().next().value!);
    }
    userResultsCache.set(userId, { at: Date.now(), data: result });
  }

  return NextResponse.json(result);
}
