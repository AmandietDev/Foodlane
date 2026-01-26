import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseMeal } from "../../../src/lib/foodParser";
import { analyzeDaily, MealEntry } from "../../../src/lib/dailyAnalyzer";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { requirePremium } from "../../../src/lib/premiumGuard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * POST /api/foodlog/add
 * Ajoute un repas au journal alimentaire
 * Input: { date, meal_type, raw_text, hunger_before?, satiety_after? }
 * Action: parse meal -> save entry -> recompute daily summary
 * Return: { entry, summary }
 */
export async function POST(request: NextRequest) {
  try {
    // Récupérer l'utilisateur depuis la requête
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est Premium
    try {
      await requirePremium(request, userId);
    } catch (error) {
      // requirePremium throw une NextResponse, on la retourne directement
      return error as NextResponse;
    }

    const body = await request.json();
    const { date, meal_type, raw_text, hunger_before, satiety_after, mood_energy } = body;

    // Validation
    if (!date || !meal_type || !raw_text) {
      return NextResponse.json(
        { error: "date, meal_type et raw_text sont requis" },
        { status: 400 }
      );
    }

    if (!["breakfast", "lunch", "dinner", "snack"].includes(meal_type)) {
      return NextResponse.json(
        { error: "meal_type doit être breakfast, lunch, dinner ou snack" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Parser le repas
    const parsed = parseMeal(raw_text);
    const confidence = parsed.items.length > 0
      ? Math.round(parsed.items.reduce((sum, item) => sum + item.confidence, 0) / parsed.items.length)
      : 0;

    // Sauvegarder l'entrée
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: entry, error: insertError } = await supabase
      .from("food_log_entries")
      .insert({
        user_id: userId,
        date,
        meal_type,
        raw_text,
        parsed,
        confidence,
        hunger_before: hunger_before || null,
        satiety_after: satiety_after || null,
        mood_energy: mood_energy || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[FoodLog] Erreur insertion:", insertError);
      return NextResponse.json(
        { error: "Erreur lors de l'ajout du repas", details: insertError.message },
        { status: 500 }
      );
    }

    // Récupérer tous les repas du jour pour recalculer le summary
    const { data: allMeals, error: fetchError } = await supabase
      .from("food_log_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("[FoodLog] Erreur récupération repas:", fetchError);
      // Continuer quand même, on retourne l'entrée créée
    }

    // Récupérer le profil utilisateur pour le contexte
    // Si les colonnes n'existent pas encore, utiliser des valeurs par défaut
    let profile: any = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("allergies, diets, objective, behavioral_preferences")
        .eq("id", userId)
        .single();
      profile = data;
    } catch (error) {
      // Si les colonnes n'existent pas, continuer avec des valeurs par défaut
      console.warn("[FoodLog] Profil non trouvé ou colonnes manquantes, utilisation de valeurs par défaut");
    }

    // Convertir les repas en format MealEntry pour l'analyse
    const mealEntries: MealEntry[] = (allMeals || []).map(m => ({
      meal_type: m.meal_type as "breakfast" | "lunch" | "dinner" | "snack",
      parsed: m.parsed,
      hunger_before: m.hunger_before || undefined,
      satiety_after: m.satiety_after || undefined,
    }));

    // Analyser la journée
    const context = {
      objective: profile?.objective || undefined,
      allergies: (profile?.allergies as string[]) || [],
      diets: (profile?.diets as string[]) || [],
      behavioral_preferences: (profile?.behavioral_preferences as string[]) || [],
    };

    const summary = analyzeDaily(mealEntries, context);

    // Sauvegarder ou mettre à jour le daily_summary
    const { error: summaryError } = await supabase
      .from("daily_summaries")
      .upsert({
        user_id: userId,
        date,
        score: summary.score,
        strengths: summary.strengths,
        priority_tip: summary.priority_tip,
        tip_options: summary.tip_options,
        missing_components: summary.missing_components,
        plan_for_tomorrow: summary.plan_for_tomorrow,
        meta: summary.meta,
      }, {
        onConflict: "user_id,date"
      });

    if (summaryError) {
      console.error("[FoodLog] Erreur sauvegarde summary:", summaryError);
      // Continuer quand même
    }

    return NextResponse.json({
      entry,
      summary,
    });
  } catch (error) {
    console.error("[FoodLog] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

