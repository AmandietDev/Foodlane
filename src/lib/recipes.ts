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

export async function fetchRecipesFromSheet(): Promise<Recipe[]> {
  const url = process.env.SHEET_RECIPES_CSV_URL;

  if (!url) {
    throw new Error("SHEET_RECIPES_CSV_URL is not defined");
  }

  const res = await fetch(url, {
    cache: "no-store", // on récupère toujours la dernière version du Google Sheet
  });

  if (!res.ok) {
    throw new Error(`Erreur lors du téléchargement du CSV: ${res.status}`);
  }

  const csvText = await res.text();

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data as Array<Record<string, string | number | undefined>>;

  // On filtre les lignes vides (sans nom de recette)
  const recipes: Recipe[] = rows
    .filter((row) => row["Nom de la recette"])
    .map((row) => ({
      id: Number(row["ID"] || 0),
      type: row["Type (sucré/salé)"] || null,
      difficulte: row["Difficulté (Facile/Moyen/Difficile)"] || null,
      temps_preparation_min: row["Temps de préparation (min)"]
        ? Number(row["Temps de préparation (min)"])
        : null,
      categorie_temps: row["Catégorie temps (sélection)"] || null,
      nombre_personnes: row["Nombre de personnes"]
        ? Number(row["Nombre de personnes"])
        : null,
      nom_recette: row["Nom de la recette"] || null,
      description_courte: row["Description courte"] || null,
      ingredients: row["Ingrédients + quantités (séparés par ;)"] || null,
      instructions: row["Instructions (étapes séparées par ;)"] || null,
      equipements: row["Équipements nécessaires (séparés par ;)"] || null,
      calories: row["Calories (pour une portion)"] ? Number(row["Calories (pour une portion)"]) : null,
      image_url: row["image_url"] || null,
      created_at: new Date().toISOString(),
    }));

  return recipes;
}

