import { NextResponse } from "next/server";
import { fetchRecipes } from "../../src/lib/recipes";

export const dynamic = 'force-dynamic'; // Désactiver le cache pour cette route
export const revalidate = 0; // Ne jamais mettre en cache

export async function GET() {
  try {
    // Utiliser la fonction fetchRecipes qui choisit automatiquement entre Supabase et Google Sheets
    const recipes = await fetchRecipes();
    
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

