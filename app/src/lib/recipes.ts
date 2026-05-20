import Papa from "papaparse";
import { deriveRecipeFeatures } from "./recipeFeatures";

export type Recipe = {
  id: number;
  type: string | null;
  difficulte: string | null;
  temps_preparation_min: number | null;
  categorie_temps: string | null;
  nombre_personnes: number | null;
  nom_recette: string | null;
  description_courte: string | null;
  saison?: string | null;

  // ── Métadonnées structurées (recipes_v2 enrichie) ────────────────────────
  /** ex. "petit_dejeuner|dejeuner|diner". Multi-valeurs séparées. */
  meal_slot?: string | null;
  /** ex. "salade", "plat principal", "tarte salee", "soupe", "bowl"... */
  dish_type?: string | null;
  /** ex. "poulet", "boeuf", "tofu". Peut contenir plusieurs valeurs. */
  main_protein?: string | null;
  /** ex. "riz", "pates", "quinoa", "pomme de terre", "sans". */
  main_carb?: string | null;
  /** ex. "courgette|tomate|poivron". Multi-valeurs. */
  main_vegetables?: string | null;
  /** Allergènes structurés (ex. "gluten|lactose|fruits a coque"). */
  allergens?: string | null;
  /** Tags d'ingrédients (NB: typo "igredient" conservée côté DB). */
  igredient_tags?: string | null;
  /** Alias accepté en lecture si la colonne est renommée un jour. */
  ingredient_tags?: string | null;
  /** Tags de régime (ex. "vegetarien|sans_gluten|riche_en_proteines"). */
  diet_tags?: string | null;

  // ── Métadonnées dérivées (heuristiques de fallback) ──────────────────────
  family?: string | null;
  cooking_method?: string | null;
  texture?: string | null;
  meal_subtype?: string | null;

  // ── Ingrédients / instructions / équipements / nutrition ─────────────────
  /** Legacy : ancien nom de colonne (gardé pour le fallback CSV). */
  ingredients: string | null;
  /** Nouveau nom recipes_v2. Utiliser getIngredientsText() pour lire. */
  ingredients_quantites?: string | null;
  instructions: string | null;
  /** Legacy : ancien nom (CSV). */
  equipements: string | null;
  /** Nouveau nom recipes_v2. */
  equipements_necessaires?: string | null;
  /** Legacy : ancien nom (CSV). */
  calories: number | null;
  /** Nouveau nom recipes_v2. */
  calories_par_portion?: number | null;

  image_url: string | null;
  created_at: string;
};

/** Cache court en mémoire (process) pour éviter 2× chargement complet (ex. /api/recipes + /api/recipes/for-me). */
let recipesFetchCache: { data: Recipe[]; expiresAt: number } | null = null;
const RECIPES_FETCH_CACHE_TTL_MS = 120_000;

/**
 * Fonction principale pour récupérer les recettes
 * Utilise Supabase si configuré, sinon Google Sheets (fallback)
 */
export async function fetchRecipes(): Promise<Recipe[]> {
  if (recipesFetchCache && Date.now() < recipesFetchCache.expiresAt) {
    return recipesFetchCache.data;
  }

  // Vérifier si Supabase est configuré
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let recipes: Recipe[];

  if (supabaseUrl && supabaseKey) {
    try {
      // Utiliser Supabase
      const { fetchRecipesFromSupabase } = await import('./recipes-supabase');
      recipes = await fetchRecipesFromSupabase();
    } catch (error) {
      console.error('[Recipes] Erreur avec Supabase, fallback vers Google Sheets:', error);
      // Fallback vers Google Sheets en cas d'erreur
      recipes = await fetchRecipesFromSheet();
    }
  } else {
    // Fallback vers Google Sheets si Supabase n'est pas configuré
    console.log('[Recipes] Supabase non configuré, utilisation de Google Sheets');
    recipes = await fetchRecipesFromSheet();
  }

  recipesFetchCache = {
    data: recipes,
    expiresAt: Date.now() + RECIPES_FETCH_CACHE_TTL_MS,
  };
  return recipes;
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
        const saisonRaw =
          (row["saison"] || row["Saison"] || row["SAISON"] || "").toString().trim();
        const familyRaw = (row["family"] || row["Family"] || "").toString().trim();
        const cookingMethodRaw = (row["cooking_method"] || row["Cooking Method"] || "").toString().trim();
        const textureRaw = (row["texture"] || row["Texture"] || "").toString().trim();
        const mealSubtypeRaw = (row["meal_subtype"] || row["Meal Subtype"] || "").toString().trim();
        const derived = deriveRecipeFeatures({
          nom_recette: nomRecette || null,
          type: type || null,
          ingredients: ingredients || null,
          instructions: instructions || null,
          family: familyRaw || null,
          cooking_method: cookingMethodRaw || null,
          texture: textureRaw || null,
          meal_subtype: mealSubtypeRaw || null,
        });

        return {
          id: Number((row["ID"] && row["ID"]!.toString().trim()) || index + 1),
          type: type || null,
          difficulte: difficulte || null,
          temps_preparation_min: tempsPrep ? Number(tempsPrep) : null,
          categorie_temps: categorieTemps || null,
          nombre_personnes: nbPersonnes ? Number(nbPersonnes) : null,
          nom_recette: nomRecette || null,
          description_courte: description || null,
          saison: saisonRaw ? saisonRaw : null,
          family: derived.family,
          cooking_method: derived.cooking_method,
          texture: derived.texture,
          meal_subtype: derived.meal_subtype,
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

