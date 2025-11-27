import { NextResponse } from "next/server";
import { fetchRecipesFromSheet } from "../../src/lib/recipes";

export const dynamic = 'force-dynamic'; // Désactiver le cache pour cette route
export const revalidate = 0; // Ne jamais mettre en cache

export async function GET() {
  try {
    // Vérifier que l'URL de la base de données est configurée
    if (!process.env.SHEET_RECIPES_CSV_URL) {
      console.error("[API] SHEET_RECIPES_CSV_URL n'est pas défini dans les variables d'environnement");
      return NextResponse.json(
        { error: "Configuration manquante: SHEET_RECIPES_CSV_URL n'est pas défini" },
        { status: 500 }
      );
    }
    
    const recipes = await fetchRecipesFromSheet();
    
    // Log pour déboguer
    const sweetCount = recipes.filter(r => {
      const type = (r.type?.toLowerCase() || "").trim();
      return type.includes("sucré") || type.includes("sucree") || type.includes("sucr");
    }).length;
    const savoryCount = recipes.filter(r => {
      const type = (r.type?.toLowerCase() || "").trim();
      return type.includes("salé") || type.includes("sale") || type.includes("sal");
    }).length;
    
    console.log(`[API] ${recipes.length} recettes récupérées (${sweetCount} sucrées, ${savoryCount} salées)`);
    
    // Afficher quelques exemples pour vérifier
    if (sweetCount > 0) {
      const examples = recipes.filter(r => {
        const type = (r.type?.toLowerCase() || "").trim();
        return type.includes("sucré") || type.includes("sucree") || type.includes("sucr");
      }).slice(0, 3);
      console.log(`[API] Exemples de recettes sucrées:`, examples.map(r => ({ nom: r.nom, type: r.type })));
    }
    
    return NextResponse.json({ recipes }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("Erreur API /api/recipes :", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erreur lors de la récupération des recettes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

