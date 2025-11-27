import Papa from "papaparse";

export type Recipe = {
  id: string;
  type: string; // sucré / salé
  difficulte: string; // Facile / Moyen / Difficile
  temps_preparation_min: number;
  categorie_temps: string;
  nb_personnes: number;
  nom: string;
  description_courte: string;
  ingredients: string; // "Ingrédients + quantités (séparés par ;)"
  instructions: string; // "Instructions (étapes séparées par ;)"
  equipements: string; // "Équipements nécessaires (séparés par ;)"
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

  const rows = parsed.data as any[];

  // On filtre les lignes vides (sans nom de recette)
  const recipes: Recipe[] = rows
    .filter((row) => row["Nom de la recette"])
    .map((row) => ({
      id: row["ID"]?.toString() ?? "",
      type: row["Type (sucré/salé)"] || "",
      difficulte: row["Difficulté (Facile/Moyen/Difficile)"] || "",
      temps_preparation_min: row["Temps de préparation (min)"]
        ? Number(row["Temps de préparation (min)"])
        : 0,
      categorie_temps: row["Catégorie temps (sélection)"] || "",
      nb_personnes: row["Nombre de personnes"]
        ? Number(row["Nombre de personnes"])
        : 0,
      nom: row["Nom de la recette"] || "",
      description_courte: row["Description courte"] || "",
      ingredients: row["Ingrédients + quantités (séparés par ;)"] || "",
      instructions: row["Instructions (étapes séparées par ;)"] || "",
      equipements: row["Équipements nécessaires (séparés par ;)"] || "",
    }));

  return recipes;
}

