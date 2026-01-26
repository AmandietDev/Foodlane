import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { requirePremium } from "../../../src/lib/premiumGuard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * GET /api/foodlog/weekly?week_start=YYYY-MM-DD
 * Récupère ou calcule les insights hebdomadaires
 * Return: weekly insights (patterns, one_action)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const weekStart = searchParams.get("week_start");

    if (!weekStart) {
      return NextResponse.json(
        { error: "Le paramètre week_start est requis (format YYYY-MM-DD)" },
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

    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // Calculer la fin de semaine (7 jours après week_start)
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const endDateStr = endDate.toISOString().split("T")[0];

    // Vérifier si des insights existent déjà
    const { data: existingInsights } = await supabase
      .from("weekly_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .single();

    // Récupérer tous les repas de la semaine
    const { data: meals, error: mealsError } = await supabase
      .from("food_log_entries")
      .select("*")
      .eq("user_id", userId)
      .gte("date", weekStart)
      .lte("date", endDateStr)
      .order("date", { ascending: true });

    if (mealsError) {
      console.error("[FoodLog] Erreur récupération repas:", mealsError);
    }

    // Si pas assez de données, retourner un message
    if (!meals || meals.length < 3) {
      return NextResponse.json({
        user_id: userId,
        week_start: weekStart,
        patterns: {
          message: "Pas assez de données cette semaine pour analyser des patterns. Continue à noter tes repas !"
        },
        one_action: "Note au moins 2-3 repas par jour pour que je puisse t'aider à identifier des patterns",
      });
    }

    // Analyser les patterns
    const patterns: Record<string, any> = {};
    
    // Compter les composants manquants
    const missingFibers = meals.filter(m => 
      m.parsed.components.veggie.length === 0 && m.parsed.components.fruit.length === 0
    ).length;
    const missingProteins = meals.filter(m => 
      m.parsed.components.protein.length === 0
    ).length;
    const missingVeggies = meals.filter(m => 
      m.parsed.components.veggie.length === 0
    ).length;
    
    // Compter les repas sautés (moins de 2 repas structurés par jour)
    const mealsByDate: Record<string, number> = {};
    meals.forEach(m => {
      if (m.meal_type !== "snack") {
        mealsByDate[m.date] = (mealsByDate[m.date] || 0) + 1;
      }
    });
    const skippedMealsDays = Object.values(mealsByDate).filter(count => count < 2).length;
    
    // Détecter les collations déséquilibrées
    const snacks = meals.filter(m => m.meal_type === "snack");
    const unbalancedSnacks = snacks.filter(s => 
      s.parsed.components.treat.length > 0 && 
      s.parsed.components.fruit.length === 0 &&
      s.parsed.components.veggie.length === 0
    ).length;

    // Construire les patterns
    if (missingVeggies > meals.length * 0.5) {
      patterns.low_vegetables = `Tu manques de légumes dans ${Math.round(missingVeggies / meals.length * 100)}% de tes repas cette semaine`;
    }
    if (missingProteins > meals.length * 0.4) {
      patterns.low_proteins = `Tu manques de protéines dans ${Math.round(missingProteins / meals.length * 100)}% de tes repas`;
    }
    if (missingFibers > meals.length * 0.5) {
      patterns.low_fibers = `Tu manques de fibres (légumes/fruits) dans ${Math.round(missingFibers / meals.length * 100)}% de tes repas`;
    }
    if (skippedMealsDays > 2) {
      patterns.skipped_meals = `Tu as sauté des repas ${skippedMealsDays} jours cette semaine`;
    }
    if (unbalancedSnacks > snacks.length * 0.5 && snacks.length > 0) {
      patterns.unbalanced_snacks = `Tes collations sont souvent déséquilibrées (${unbalancedSnacks} sur ${snacks.length})`;
    }

    // Si aucun pattern détecté, message positif
    if (Object.keys(patterns).length === 0) {
      patterns.positive = "Cette semaine, tu as bien varié tes repas et maintenu un bon équilibre !";
    }

    // Générer une action hebdomadaire
    let oneAction = "";
    if (patterns.low_vegetables) {
      oneAction = "Cette semaine, ajoute des légumes à au moins 2 repas par jour";
    } else if (patterns.low_proteins) {
      oneAction = "Cette semaine, inclus une source de protéines à chaque repas principal";
    } else if (patterns.skipped_meals) {
      oneAction = "Cette semaine, essaie de prendre au moins 2 repas structurés par jour";
    } else if (patterns.unbalanced_snacks) {
      oneAction = "Cette semaine, remplace une collation sucrée par un fruit ou des légumes";
    } else {
      oneAction = "Continue à varier tes repas comme tu le fais, c'est parfait !";
    }

    const insights = {
      user_id: userId,
      week_start: weekStart,
      patterns,
      one_action: oneAction,
    };

    // Sauvegarder les insights
    await supabase
      .from("weekly_insights")
      .upsert(insights, { onConflict: "user_id,week_start" });

    return NextResponse.json(insights);
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

