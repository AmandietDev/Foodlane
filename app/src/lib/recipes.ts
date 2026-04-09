import Papa from "papaparse";

export type Recipe = {
  id: number;
  type: string | null;
  difficulte: string | null;
  temps_preparation_min: number | null;
  categorie_temps: string | null;
  nombre_personnes: number | null;
  nom_recette: string | null;
  description_courte: string | null;
  ingredients: string | null;
  instructions: string | null;
  equipements: string | null;
  calories: number | null;
  image_url: string | null;
  created_at: string;
};

/**
 * Fonction principale pour récupérer les recettes
 * Utilise Supabase si configuré, sinon Google Sheets (fallback)
 */
export async function fetchRecipes(): Promise<Recipe[]> {
  // Vérifier si Supabase est configuré
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      // Utiliser Supabase
      const { fetchRecipesFromSupabase } = await import('./recipes-supabase');
      return await fetchRecipesFromSupabase();
    } catch (error) {
      console.error('[Recipes] Erreur avec Supabase, fallback vers Google Sheets:', error);
      // Fallback vers Google Sheets en cas d'erreur
      return await fetchRecipesFromSheet();
    }
  } else {
    // Fallback vers Google Sheets si Supabase n'est pas configuré
    console.log('[Recipes] Supabase non configuré, utilisation de Google Sheets');
    return await fetchRecipesFromSheet();
  }
}

type RawRow = {
  [key: string]: string | undefined;
};

export async function fetchRecipesFromSheet(): Promise<Recipe[]> {
  let url = process.env.SHEET_RECIPES_CSV_URL;

  if (!url) {
    console.error("[Recipes] SHEET_RECIPES_CSV_URL n'est pas défini");
    throw new Error("SHEET_RECIPES_CSV_URL is not defined. Vérifiez votre fichier .env.local");
  }

  // Nettoyer l'URL si elle contient le nom de la variable (ex: "SHEET_RECIPES_CSV_URL=https://...")
  if (url.startsWith("SHEET_RECIPES_CSV_URL=")) {
    url = url.replace(/^SHEET_RECIPES_CSV_URL=/, "");
    console.warn("[Recipes] L'URL contenait le nom de la variable, nettoyage effectué");
  }

  // Vérifier que c'est bien une URL valide
  try {
    new URL(url);
  } catch {
    console.error("[Recipes] URL invalide:", url);
    throw new Error(`URL invalide pour SHEET_RECIPES_CSV_URL: "${url}". Vérifiez votre fichier .env.local`);
  }

  console.log("[Recipes] Tentative de récupération depuis:", url);

  try {
    const res = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 }, // Désactiver complètement le cache
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`[Recipes] Erreur HTTP ${res.status} lors du téléchargement du CSV:`, errorText.substring(0, 200));
      throw new Error(`Erreur lors du téléchargement du CSV: ${res.status} - ${res.statusText}`);
    }

    const csvText = await res.text();
    
    if (!csvText || csvText.trim().length === 0) {
      console.error("[Recipes] Le CSV téléchargé est vide");
      throw new Error("Le fichier CSV téléchargé est vide");
    }

    console.log(`[Recipes] CSV téléchargé: ${csvText.length} caractères`);

    const parsed = Papa.parse<RawRow>(csvText, {
      header: true,        // 🔴 On utilise les NOMS de colonnes
      skipEmptyLines: true,
    });

    const rows = parsed.data;

    // Vérifier les colonnes disponibles (pour débogage)
    if (rows.length > 0) {
      const firstRow = rows[0];
      const availableColumns = Object.keys(firstRow);
      console.log("[Recipes] Colonnes disponibles dans le CSV:", availableColumns);
      
      // Vérifier que les colonnes attendues existent
      const requiredColumns = [
        "Type (sucré/salé)",
        "Difficulté (Facile/Moyen/Difficile)",
        "Temps de préparation (min)",
        "Catégorie temps (sélection)",
        "Nombre de personnes",
        "Nom de la recette",
        "Description courte",
        "Ingrédients + quantités (séparés par ;)",
        "Instructions (étapes séparées par ;)",
        "Équipements nécessaires (séparés par ;)",
        "Calories (pour une portion)",
        "image_url"
      ];
      
      const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
      if (missingColumns.length > 0) {
        console.warn("[Recipes] Colonnes manquantes:", missingColumns);
      }
    }

    const recipes: Recipe[] = rows
      .filter((row) => {
        const nom = row["Nom de la recette"];
        return nom && nom.trim().length > 0;
      })
      .map((row, index) => {
        // Utiliser exactement les noms de colonnes de la base de données
        const type = (row["Type (sucré/salé)"] || "").trim();
        const difficulte = (row["Difficulté (Facile/Moyen/Difficile)"] || "").trim();
        const tempsPrep = (row["Temps de préparation (min)"] || "").trim();
        const categorieTemps = (row["Catégorie temps (sélection)"] || "").trim();
        const nbPersonnes = (row["Nombre de personnes"] || "").trim();
        const nomRecette = (row["Nom de la recette"] || "").trim();
        const description = (row["Description courte"] || "").trim();
        const ingredients = (row["Ingrédients + quantités (séparés par ;)"] || "").trim();
        const instructions = (row["Instructions (étapes séparées par ;)"] || "").trim();
        const equipements = (row["Équipements nécessaires (séparés par ;)"] || "").trim();
        const calories = (row["Calories (pour une portion)"] || "").trim();
        const imageUrl = (row["image_url"] || "").trim();
        
        return {
          id: Number((row["ID"] && row["ID"]!.toString().trim()) || index + 1),
          type: type || null,
          difficulte: difficulte || null,
          temps_preparation_min: tempsPrep ? Number(tempsPrep) : null,
          categorie_temps: categorieTemps || null,
          nombre_personnes: nbPersonnes ? Number(nbPersonnes) : null,
          nom_recette: nomRecette || null,
          description_courte: description || null,
          ingredients: ingredients || null,
          instructions: instructions || null,
          equipements: equipements || null,
          calories: calories ? Number(calories) : null,
          image_url: imageUrl || null,
          created_at: new Date().toISOString(),
        };
      });
    
    // Log pour vérifier la répartition par type
    const sweetCount = recipes.filter(r => {
      const type = (r.type?.toLowerCase() || "").trim();
      return type.includes("sucré") || type.includes("sucree") || type.includes("sucr");
    }).length;
    const savoryCount = recipes.filter(r => {
      const type = (r.type?.toLowerCase() || "").trim();
      return type.includes("salé") || type.includes("sale") || type.includes("sal");
    }).length;
    console.log(`[Recipes] ${recipes.length} recettes chargées (${sweetCount} sucrées, ${savoryCount} salées)`);

    return recipes;
  } catch (error) {
    console.error("[Recipes] Erreur lors de la récupération des recettes:", error);
    if (error instanceof Error) {
      throw error; // Re-lancer l'erreur avec le message original
    }
    throw new Error("Erreur inconnue lors de la récupération des recettes");
  }
}

