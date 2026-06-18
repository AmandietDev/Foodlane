import { NextRequest, NextResponse } from "next/server";
import { parseMeal, coerceParsedMeal } from "../../../src/lib/foodParser";
import { analyzeDaily, type MealEntry } from "../../../src/lib/dailyAnalyzer";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { requirePremium } from "../../../src/lib/premiumGuard";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/foodlog/[id]
 * Met à jour le contenu d'un repas (texte / aliments) et recalcule le résumé du jour.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    try {
      await requirePremium(request, userId);
    } catch (error) {
      return error as NextResponse;
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const raw_text = typeof body.raw_text === "string" ? body.raw_text.trim() : "";

    if (!raw_text) {
      return NextResponse.json({ error: "raw_text est requis" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("food_log_entries")
      .select("id, date, meal_type")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Repas introuvable" }, { status: 404 });
    }

    const parsed = coerceParsedMeal(parseMeal(raw_text));
    const confidence =
      parsed.items.length > 0
        ? Math.round(parsed.items.reduce((sum, item) => sum + item.confidence, 0) / parsed.items.length)
        : 0;

    const { data: entry, error: updateError } = await supabaseAdmin
      .from("food_log_entries")
      .update({ raw_text, parsed, confidence })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour", details: updateError.message },
        { status: 500 }
      );
    }

    const date = existing.date as string;
    const { data: allMeals } = await supabaseAdmin
      .from("food_log_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("created_at", { ascending: true });

    let profile: {
      objective?: string;
      allergies?: string[];
      diets?: string[];
      behavioral_preferences?: string[];
    } | null = null;
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("allergies, diets, objective, behavioral_preferences")
        .eq("id", userId)
        .single();
      profile = data;
    } catch {
      /* valeurs par défaut */
    }

    const mealEntries: MealEntry[] = (allMeals || [])
      .filter((m) => m.meal_type !== "hydration")
      .map((m) => ({
        meal_type: m.meal_type as "breakfast" | "lunch" | "dinner" | "snack",
        parsed: coerceParsedMeal(m.parsed),
        hunger_before: m.hunger_before || undefined,
        satiety_after: m.satiety_after || undefined,
      }));

    const summary = analyzeDaily(mealEntries, {
      objective: profile?.objective || undefined,
      allergies: (profile?.allergies as string[]) || [],
      diets: (profile?.diets as string[]) || [],
      behavioral_preferences: (profile?.behavioral_preferences as string[]) || [],
    });

    await supabaseAdmin.from("daily_summaries").upsert(
      {
        user_id: userId,
        date,
        score: summary.score,
        strengths: summary.strengths,
        priority_tip: summary.priority_tip,
        tip_options: summary.tip_options,
        missing_components: summary.missing_components,
        plan_for_tomorrow: summary.plan_for_tomorrow,
        meta: {
          ...summary.meta,
          meal_ids: (allMeals || []).map((m) => m.id).sort(),
        },
      },
      { onConflict: "user_id,date" }
    );

    return NextResponse.json({ entry, summary });
  } catch (error) {
    console.error("[FoodLog] PATCH:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
