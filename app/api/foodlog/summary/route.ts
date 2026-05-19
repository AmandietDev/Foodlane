import { NextRequest, NextResponse } from "next/server";
import { analyzeDaily, MealEntry } from "../../../src/lib/dailyAnalyzer";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { requirePremium } from "../../../src/lib/premiumGuard";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";

/**
 * GET /api/foodlog/summary?date=YYYY-MM-DD
 * Récupère ou calcule le résumé journalier
 * Return: daily summary (calculer si absent)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Le paramètre date est requis (format YYYY-MM-DD)" },
        { status: 400 }
      );
    }

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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Serveur non configuré (Supabase admin)" },
        { status: 503 }
      );
    }

    const db = supabaseAdmin;

    // Vérifier si un summary existe déjà
    const { data: existingSummary, error: fetchError } = await db
      .from("daily_summaries")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .single();

    // Si le summary existe et qu'il y a des repas, le retourner
    if (existingSummary && !fetchError) {
      // Vérifier si des repas ont été ajoutés depuis la dernière mise à jour
      const { data: meals } = await db
        .from("food_log_entries")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date)
        .order("created_at", { ascending: true });

      if (meals && meals.length > 0) {
        // Vérifier si le summary est à jour (dernière entrée après le summary)
        const lastMeal = meals[meals.length - 1];
        const summaryUpdated = new Date(existingSummary.updated_at);
        const lastMealCreated = new Date(lastMeal.created_at);

        // Si le summary est récent, le retourner
        if (summaryUpdated >= lastMealCreated) {
          return NextResponse.json(existingSummary);
        }
      } else {
        // Pas de repas, retourner le summary existant ou un summary vide
        return NextResponse.json(existingSummary);
      }
    }

    // Sinon, calculer le summary
    const { data: meals, error: mealsError } = await db
      .from("food_log_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("created_at", { ascending: true });

    if (mealsError) {
      console.error("[FoodLog] Erreur récupération repas:", mealsError);
    }

    // Récupérer le profil utilisateur pour le contexte
    const { data: profile } = await db
      .from("profiles")
      .select("allergies, diets, objective, behavioral_preferences")
      .eq("id", userId)
      .single();

    // Si aucun repas, retourner un summary vide avec message
    if (!meals || meals.length === 0) {
      const emptySummary = {
        user_id: userId,
        date,
        score: 0,
        strengths: [],
        priority_tip: "Je n'ai pas assez de données aujourd'hui, mais voici 2 actions simples : ajoute des légumes à ton prochain repas et prends au moins 2 repas structurés.",
        tip_options: [
          "Option 1 : commence par noter tes repas pour que je puisse t'aider",
          "Option 2 : ajoute des légumes à ton prochain repas"
        ],
        missing_components: ["données insuffisantes"],
        plan_for_tomorrow: {
          breakfast: [
            "Dès que tu notes un repas, j’affine tes conseils. En attendant : demain matin, pose bol + cuillère + 1 fruit visible sur la table pour ne pas sauter le petit-déjeuner.",
            "Express 3 min : flocons d’avoine + boisson (lait ou végétale) + cannelle au micro-ondes couvert — moins de friction le matin.",
          ],
          lunch: [
            "Sans historique, vise un déjeuner « clé en main » : barquette de crudités (150 g) + thon naturel 1 petite boîte + riz précuit complet (½ sachet), assaisonnement citron-moutarde.",
            "Si tu manges dehors : choisis une formule où tu vois des légumes + une protéine identifiable (évite la formule 100 % frites + soda).",
          ],
          dinner: [
            "Demain soir, règle simple : 200 g de légumes cuits (surgelés mélangés OK) + 120 g de protéine + 80 g de féculent cuit au centre de l’assiette.",
            "Après le repas, range les restes tout de suite dans des boîtes : tu réduis les « petits grignotages » devant l’écran.",
          ],
          snack: [
            "Collation utile : thé non sucré + 2 abricots secs + 4 noisettes pour un creux de fin d’après-midi sans pic de sucre rapide.",
            "Hydratation : une gourde 750 mL sur le bureau ; vise de la finir avant 18 h pour mieux lire la faim au dîner.",
          ],
        },
        meta: {
          components_found: [],
          rules_triggered: ["insufficient_data"]
        }
      };

      // Sauvegarder le summary vide
      await db
        .from("daily_summaries")
        .upsert(emptySummary, { onConflict: "user_id,date" });

      return NextResponse.json(emptySummary);
    }

    // Convertir les repas en format MealEntry
    const mealEntries: MealEntry[] = meals.map(m => ({
      meal_type: m.meal_type as "breakfast" | "lunch" | "dinner" | "snack",
      parsed: m.parsed,
      hunger_before: m.hunger_before || undefined,
      satiety_after: m.satiety_after || undefined,
    }));

    // Analyser
    const context = {
      objective: profile?.objective || undefined,
      allergies: (profile?.allergies as string[]) || [],
      diets: (profile?.diets as string[]) || [],
      behavioral_preferences: (profile?.behavioral_preferences as string[]) || [],
    };

    const summary = analyzeDaily(mealEntries, context);

    // Sauvegarder le summary
    const summaryToSave = {
      user_id: userId,
      date,
      score: summary.score,
      strengths: summary.strengths,
      priority_tip: summary.priority_tip,
      tip_options: summary.tip_options,
      missing_components: summary.missing_components,
      plan_for_tomorrow: summary.plan_for_tomorrow,
      meta: summary.meta,
    };

    const { data: savedSummary, error: saveError } = await db
      .from("daily_summaries")
      .upsert(summaryToSave, { onConflict: "user_id,date" })
      .select()
      .single();

    if (saveError) {
      console.error("[FoodLog] Erreur sauvegarde summary:", saveError);
      // Retourner quand même le summary calculé
      return NextResponse.json(summaryToSave);
    }

    return NextResponse.json(savedSummary);
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

