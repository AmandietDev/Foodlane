import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { fetchRecipes } from "../../../src/lib/recipes";
import { scoreRecipesForUserProfile } from "../../../src/lib/recipePersonalizationAi";
import { DEFAULT_PLANNER_PREFERENCES } from "../../../src/lib/weeklyPlanner";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../src/lib/plannerServer";
import type { PlannerPreferences } from "../../../src/lib/weeklyPlanner";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
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

  const recipes = await fetchRecipes();
  const { scored, usedAi } = await scoreRecipesForUserProfile(
    recipes,
    prefs,
    process.env.OPENAI_API_KEY
  );

  const out = scored.map((s) => ({
    ...s.recipe,
    personalization_score: s.score,
    personalization_reason: s.reason,
  }));

  return NextResponse.json({
    recipes: out,
    used_ai: usedAi,
    count: out.length,
  });
}
