import { NextRequest, NextResponse } from "next/server";
import { fetchRecipes } from "../../../src/lib/recipes";
import { createClient } from "@supabase/supabase-js";
import type { Recipe } from "../../../src/lib/recipes";

/**
 * API de recherche de recettes avec scoring de pertinence
 * 
 * Query params:
 * - query: string (recherche texte)
 * - ingredients: string[] (ingrédients sélectionnés, séparés par virgule)
 * - type: "all" | "sweet" | "savory"
 * - userId: string (optionnel, pour récupérer le profil et appliquer les filtres)
 */

interface SearchResult {
  recipe: Recipe;
  score: number;
  reasons: string[];
}

interface SearchResponse {
  results: Recipe[];
  suggestions: Recipe[];
  lessRelevant: Recipe[]; // Recettes moins pertinentes mais faisables avec les ingrédients
  meta: {
    query: string;
    usedIngredients: string[];
    filters: {
      allergies: string[];
      diets: string[];
    };
    noExactMatch: boolean;
    totalScored: number;
  };
}

// Fonction pour normaliser le texte (enlever accents, espaces, etc.)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
    .replace(/[^\w\s]/g, " ") // Remplace les caractères spéciaux par des espaces
    .replace(/\s+/g, " ") // Normalise les espaces
    .trim();
}

// Fonction pour déterminer la saison actuelle
function getCurrentSeason(): "printemps" | "été" | "automne" | "hiver" {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // Printemps : 21 mars - 20 juin
  if ((month === 3 && day >= 21) || month === 4 || month === 5 || (month === 6 && day < 21)) {
    return "printemps";
  }
  // Été : 21 juin - 22 septembre
  if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day < 23)) {
    return "été";
  }
  // Automne : 23 septembre - 20 décembre
  if ((month === 9 && day >= 23) || month === 10 || month === 11 || (month === 12 && day < 21)) {
    return "automne";
  }
  // Hiver : 21 décembre - 20 mars
  return "hiver";
}

// Dictionnaire des ingrédients saisonniers (normalisés)
const seasonalIngredients: Record<string, string[]> = {
  printemps: [
    "asperge", "asperges", "artichaut", "artichauts", "petit pois", "petits pois", "radis", "radis rose",
    "fraise", "fraises", "cerise", "cerises", "rhubarbe", "épinard", "épinards", "epinard", "epinards",
    "salade verte", "laitue", "carotte primeur", "carottes primeur", "navet", "navets", "oignon nouveau",
    "oignons nouveaux", "aillet", "aillets", "menthe", "ciboulette", "persil", "basilic"
  ],
  été: [
    "tomate", "tomates", "courgette", "courgettes", "aubergine", "aubergines", "poivron", "poivrons",
    "concombre", "concombres", "haricot vert", "haricots verts", "maïs", "mais", "melon", "pastèque",
    "pêche", "pêches", "peche", "peches", "abricot", "abricots", "nectarine", "nectarines",
    "cerise", "cerises", "framboise", "framboises", "mûre", "mures", "myrtille", "myrtilles",
    "basilic", "menthe", "coriandre", "estragon", "thym", "romarin"
  ],
  automne: [
    "potiron", "potirons", "citrouille", "citrouilles", "courge", "courges", "butternut", "patate douce",
    "patates douces", "champignon", "champignons", "cèpe", "cepe", "girolle", "girolles",
    "châtaigne", "chataigne", "châtaignes", "chataignes", "noix", "noisette", "noisettes",
    "raisin", "raisins", "pomme", "pommes", "poire", "poires", "prune", "prunes",
    "mûre", "mures", "figue", "figues", "chou", "choux", "brocoli", "brocolis",
    "chou-fleur", "choux-fleurs", "choufleur", "choufleurs", "endive", "endives"
  ],
  hiver: [
    "chou", "choux", "chou de bruxelles", "choux de bruxelles", "chou kale", "choux kale",
    "brocoli", "brocolis", "chou-fleur", "choux-fleurs", "choufleur", "choufleurs",
    "endive", "endives", "mâche", "mache", "scarole", "scaroles", "céleri", "celeri",
    "céleri-rave", "celeri-rave", "panais", "topinambour", "topinambours", "rutabaga",
    "rutabagas", "orange", "oranges", "oranges", "clémentine", "clementine", "clémentines",
    "clementines", "mandarine", "mandarines", "pamplemousse", "pamplemousses", "kiwi", "kiwis",
    "poireau", "poireaux", "oignon", "oignons", "échalote", "echalote", "échalotes", "echalotes"
  ]
};

// Fonction pour détecter si une recette contient des ingrédients de saison
function detectSeasonalIngredients(recipe: Recipe, season: string): number {
  const normalizedIngredients = normalizeText(recipe.ingredients || "");
  const seasonIngredients = seasonalIngredients[season as keyof typeof seasonalIngredients] || [];
  
  // Extraire les ingrédients de la recette (sans quantités)
  const ingredientsList = (recipe.ingredients || "")
    .split(";")
    .map(ing => {
      const parts = ing.trim().split(/\s+/);
      const units = ['g', 'kg', 'ml', 'l', 'cl', 'dl', 'cuillere', 'cuilleres', 'tasse', 'tasses', 'pincee', 'pincées', 'pincees', 'soupe', 'cafe', 'the', 'd', 'de', "d'"];
      let startIdx = 0;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (/^\d+([.,]\d+)?$/.test(part) || units.some(u => part.toLowerCase().includes(u))) {
          startIdx = i + 1;
        } else {
          break;
        }
      }
      return startIdx < parts.length ? parts.slice(startIdx).join(" ") : ing.trim();
    })
    .map(ing => normalizeText(ing))
    .filter(ing => ing.length > 0);
  
  let matchCount = 0;
  const matchedIngredients = new Set<string>(); // Pour éviter les doublons
  
  seasonIngredients.forEach(ingredient => {
    const normalizedIngredient = normalizeText(ingredient);
    
    // Vérifier dans le texte complet normalisé
    if (normalizedIngredients.includes(normalizedIngredient)) {
      matchedIngredients.add(normalizedIngredient);
    } else {
      // Vérifier dans chaque ingrédient individuellement
      ingredientsList.forEach(ing => {
        if (ing.includes(normalizedIngredient) || normalizedIngredient.includes(ing)) {
          matchedIngredients.add(normalizedIngredient);
        }
      });
    }
  });

  return matchedIngredients.size;
}

// Fonction pour calculer le score de pertinence d'une recette
function calculateRecipeScore(
  recipe: Recipe,
  query: string,
  selectedIngredients: string[],
  userAllergies: string[] = [],
  userDiets: string[] = [],
  currentSeason?: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // Détecter la saison si non fournie
  const season = currentSeason || getCurrentSeason();

  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(recipe.nom || "");
  const normalizedDescription = normalizeText(recipe.description_courte || "");
  const normalizedIngredients = normalizeText(recipe.ingredients || "");

  // 1. Match titre (fort)
  if (normalizedQuery) {
    if (normalizedTitle === normalizedQuery) {
      score += 50;
      reasons.push("Titre exact");
    } else if (normalizedTitle.includes(normalizedQuery)) {
      score += 25;
      reasons.push("Titre partiel");
    } else {
      // Recherche fuzzy dans le titre
      const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
      let titleMatchCount = 0;
      queryWords.forEach(word => {
        if (normalizedTitle.includes(word)) {
          titleMatchCount++;
        }
      });
      if (titleMatchCount > 0) {
        score += 10 + (titleMatchCount * 5);
        reasons.push(`Titre fuzzy (${titleMatchCount} mots)`);
      }
    }
  }

  // 2. Match description (moyen)
  if (normalizedQuery && normalizedDescription.includes(normalizedQuery)) {
    score += 20;
    reasons.push("Description");
  } else if (normalizedQuery) {
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
    let descMatchCount = 0;
    queryWords.forEach(word => {
      if (normalizedDescription.includes(word)) {
        descMatchCount++;
      }
    });
    if (descMatchCount > 0) {
      score += 5 + (descMatchCount * 2);
      reasons.push(`Description fuzzy (${descMatchCount} mots)`);
    }
  }

  // 3. Match ingrédients (fort, surtout si l'utilisateur a sélectionné des ingrédients)
  if (selectedIngredients.length > 0) {
    const ingredientsList = (recipe.ingredients || "")
      .split(";")
      .map(ing => normalizeText(ing.trim()))
      .filter(ing => ing.length > 0);

    let matchedIngredientsCount = 0;
    const matchedIngredientNames: string[] = [];

    selectedIngredients.forEach(ingredient => {
      const normalizedIngredient = normalizeText(ingredient);
      let found = false;

      // Recherche dans le texte complet normalisé
      if (normalizedIngredients.includes(normalizedIngredient)) {
        found = true;
      } else {
        // Chercher dans chaque ingrédient individuellement
        for (const ing of ingredientsList) {
          // Extraire le nom de l'ingrédient (sans quantité)
          const parts = ing.split(/\s+/);
          let ingredientName = ing;
          
          // Si l'ingrédient commence par un nombre ou une unité, extraire le nom
          if (parts.length > 1) {
            const units = ['g', 'kg', 'ml', 'l', 'cl', 'dl', 'cuillere', 'cuilleres', 'tasse', 'tasses', 'pincee', 'pincées', 'pincees', 'soupe', 'cafe', 'the', 'd', 'de', "d'"];
            let startIdx = 0;
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              if (/^\d+([.,]\d+)?$/.test(part) || units.some(u => part.includes(u))) {
                startIdx = i + 1;
              } else {
                break;
              }
            }
            if (startIdx < parts.length) {
              ingredientName = parts.slice(startIdx).join(" ");
            }
          }

          const normalizedIngredientName = normalizeText(ingredientName);

          // Recherche exacte
          if (normalizedIngredientName.includes(normalizedIngredient) || normalizedIngredient.includes(normalizedIngredientName)) {
            found = true;
            break;
          }

          // Recherche avec pluriels
          const termWords = normalizedIngredient.split(/\s+/);
          for (const word of termWords) {
            if (word.length >= 2) {
              const wordPattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|x|aux)?(?!\\w)`, 'i');
              if (wordPattern.test(normalizedIngredientName)) {
                found = true;
                break;
              }
            }
          }

          if (found) break;
        }
      }

      if (found) {
        matchedIngredientsCount++;
        matchedIngredientNames.push(ingredient);
      }
    });

    // Score par ingrédient trouvé (plafonné à 30 par ingrédient)
    const ingredientScore = Math.min(matchedIngredientsCount * 30, selectedIngredients.length * 30);
    score += ingredientScore;
    
    if (matchedIngredientsCount > 0) {
      reasons.push(`${matchedIngredientsCount}/${selectedIngredients.length} ingrédients`);
    }

    // Bonus si TOUS les ingrédients sont trouvés
    if (matchedIngredientsCount === selectedIngredients.length && selectedIngredients.length > 1) {
      score += 20;
      reasons.push("Tous les ingrédients");
    }
  }

  // 4. Match tags/catégories (moyen)
  // Utiliser le type comme tag
  if (normalizedQuery) {
    const normalizedType = normalizeText(recipe.type || "");
    if (normalizedType.includes(normalizedQuery) || normalizedQuery.includes(normalizedType)) {
      score += 10;
      reasons.push("Type/Catégorie");
    }
  }

  // 5. Bonus saisonnier (adaptation aux saisons)
  const seasonalMatchCount = detectSeasonalIngredients(recipe, season);
  if (seasonalMatchCount > 0) {
    // Bonus progressif : +15 pour 1 ingrédient de saison, +25 pour 2+, +35 pour 3+
    const seasonalBonus = seasonalMatchCount === 1 ? 15 : seasonalMatchCount === 2 ? 25 : 35;
    score += seasonalBonus;
    reasons.push(`Saison ${season} (${seasonalMatchCount} ingrédient${seasonalMatchCount > 1 ? "s" : ""})`);
  }

  // 6. Filtre dur : allergies (exclusion)
  if (userAllergies.length > 0) {
    const normalizedAllergies = userAllergies.map(a => normalizeText(a));
    const hasAllergen = normalizedAllergies.some(allergen => 
      normalizedIngredients.includes(allergen) || 
      normalizedTitle.includes(allergen) ||
      normalizedDescription.includes(allergen)
    );
    
    if (hasAllergen) {
      score = -1000; // Exclusion totale
      reasons.push("Contient un allergène");
      return { score, reasons };
    }
  }

  // 6. Bonus si la recette correspond au profil (régimes)
  // Note: Cette logique devrait être améliorée avec une vraie détection de régimes
  // Pour l'instant, on fait un simple bonus si le type correspond
  if (userDiets.length > 0) {
    // Bonus basique (à améliorer avec une vraie détection)
    score += 5;
    reasons.push("Profil compatible");
  }

  return { score, reasons };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "";
    const ingredientsParam = searchParams.get("ingredients") || "";
    const typeFilter = searchParams.get("type") || "all";
    const userId = searchParams.get("userId") || null;

    const selectedIngredients = ingredientsParam
      ? ingredientsParam.split(",").map(i => i.trim()).filter(i => i.length > 0)
      : [];

    console.log(`[Search] Recherche: query="${query}", ingredients=[${selectedIngredients.join(", ")}], type=${typeFilter}, userId=${userId || "none"}`);

    // Récupérer le profil utilisateur si userId fourni
    let userAllergies: string[] = [];
    let userDiets: string[] = [];

    if (userId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          // Essayer de récupérer les préférences depuis Supabase
          // Note: Les préférences peuvent être stockées dans profiles ou dans une table séparée
          // Pour l'instant, on essaie de récupérer depuis profiles
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

          if (profile) {
            // Récupérer les allergies (peut être dans différentes colonnes selon le schéma)
            // Essayer plusieurs noms de colonnes possibles
            const allergiesData = profile.allergies || profile.aversions_alimentaires || profile.aversionsAlimentaires;
            if (allergiesData) {
              if (Array.isArray(allergiesData)) {
                userAllergies = allergiesData;
              } else if (typeof allergiesData === 'string') {
                // Si c'est une string, essayer de la parser comme JSON ou la splitter par virgule
                try {
                  const parsed = JSON.parse(allergiesData);
                  userAllergies = Array.isArray(parsed) ? parsed : [allergiesData];
                } catch {
                  userAllergies = allergiesData.split(",").map(a => a.trim()).filter(a => a.length > 0);
                }
              }
            }

            // Récupérer les régimes (peut être dans différentes colonnes selon le schéma)
            const dietsData = profile.regimes_particuliers || profile.regimesParticuliers || profile.diets;
            if (dietsData) {
              if (Array.isArray(dietsData)) {
                userDiets = dietsData;
              } else if (typeof dietsData === 'string') {
                try {
                  const parsed = JSON.parse(dietsData);
                  userDiets = Array.isArray(parsed) ? parsed : [dietsData];
                } catch {
                  userDiets = dietsData.split(",").map(d => d.trim()).filter(d => d.length > 0);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("[Search] Erreur lors de la récupération du profil:", error);
        // Continuer sans filtres si erreur
      }
    }

    // Récupérer toutes les recettes
    const allRecipes = await fetchRecipes();

    // Filtrer par type si nécessaire
    let filteredRecipes = allRecipes;
    if (typeFilter !== "all") {
      filteredRecipes = allRecipes.filter(recipe => {
        const type = normalizeText(recipe.type || "");
        if (typeFilter === "sweet") {
          return type.includes("sucré") || type.includes("sucree") || type.includes("sucr");
        } else if (typeFilter === "savory") {
          return type.includes("salé") || type.includes("sale") || type.includes("sal");
        }
        return true;
      });
    }

    // Si aucun ingrédient n'est sélectionné, retourner des recettes aléatoires du type sélectionné
    if (selectedIngredients.length === 0 && query === "") {
      // Mélanger et prendre quelques recettes aléatoires
      const shuffled = [...filteredRecipes];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const randomRecipes = shuffled.slice(0, 8).map(recipe => ({
        recipe,
        score: 10, // Score de base pour les recettes aléatoires
        reasons: ["Recette du type sélectionné"]
      }));

      return NextResponse.json({
        results: randomRecipes.map(item => item.recipe),
        suggestions: [],
        lessRelevant: [],
        meta: {
          query,
          usedIngredients: [],
          filters: {
            allergies: userAllergies,
            diets: userDiets,
          },
          noExactMatch: false,
          totalScored: randomRecipes.length,
        },
      });
    }

    // Déterminer la saison actuelle une seule fois
    const currentSeason = getCurrentSeason();
    console.log(`[Search] Saison actuelle: ${currentSeason}`);

    // Calculer le score pour chaque recette
    const scored: SearchResult[] = filteredRecipes
      .map(recipe => {
        const { score, reasons } = calculateRecipeScore(
          recipe,
          query,
          selectedIngredients,
          userAllergies,
          userDiets,
          currentSeason
        );
        return { recipe, score, reasons };
      })
      .filter(item => item.score > 0) // Exclure les recettes avec score négatif (allergènes)
      .sort((a, b) => b.score - a.score); // Trier par score décroissant

    console.log(`[Search] ${scored.length} recettes avec score > 0`);

    // Analyser la distribution des scores pour adapter le nombre de résultats
    if (scored.length === 0) {
      // Aucune recette pertinente trouvée
      return NextResponse.json({
        results: [],
        suggestions: [],
        lessRelevant: [],
        meta: {
          query,
          usedIngredients: selectedIngredients,
          filters: {
            allergies: userAllergies,
            diets: userDiets,
          },
          noExactMatch: true,
          totalScored: 0,
        },
      });
    }

    // Calculer les seuils de pertinence dynamiques
    const maxScore = scored[0].score;
    const minScore = scored[scored.length - 1].score;
    const scoreRange = maxScore - minScore;

    // Définir les seuils selon la distribution des scores
    let highThreshold = 30; // Seuil par défaut pour "très pertinent"
    let mediumThreshold = 10; // Seuil pour "moyennement pertinent"

    if (scoreRange > 0) {
      // Ajuster les seuils selon la distribution réelle
      highThreshold = Math.max(30, maxScore * 0.6); // Au moins 60% du score max
      mediumThreshold = Math.max(5, maxScore * 0.3); // Au moins 30% du score max
    }

    // Catégoriser les résultats par niveau de pertinence
    const highRelevance = scored.filter(item => item.score >= highThreshold);
    const mediumRelevance = scored.filter(item => item.score >= mediumThreshold && item.score < highThreshold);
    const lowRelevance = scored.filter(item => item.score > 0 && item.score < mediumThreshold);

    console.log(`[Search] Distribution: ${highRelevance.length} très pertinentes (score >= ${highThreshold.toFixed(1)}), ${mediumRelevance.length} moyennes (${mediumThreshold.toFixed(1)}-${highThreshold.toFixed(1)}), ${lowRelevance.length} faibles (< ${mediumThreshold.toFixed(1)})`);

    // Adapter le nombre de résultats selon la pertinence disponible
    // Principe : proposer uniquement les recettes pertinentes, sans en ajouter de moins pertinentes
    let exactResults: Recipe[] = [];
    let suggestions: Recipe[] = [];
    let lessRelevant: Recipe[] = [];

    if (highRelevance.length > 0) {
      // Il y a des résultats très pertinents : proposer uniquement ceux-là
      // Si seulement 2 sont très pertinentes, on ne propose que ces 2
      exactResults = highRelevance.map(item => item.recipe);
      console.log(`[Search] ${exactResults.length} résultats très pertinents proposés (tous, sans ajout de moins pertinents)`);
      
      // Si peu de résultats très pertinents (≤ 5), ajouter des recettes moins pertinentes mais faisables
      if (exactResults.length <= 5) {
        // Ajouter des recettes moyennement pertinentes
        if (mediumRelevance.length > 0) {
          lessRelevant = mediumRelevance.slice(0, 6).map(item => item.recipe);
          console.log(`[Search] ${lessRelevant.length} recettes moins pertinentes ajoutées (moyennement pertinentes)`);
        }
        // Si toujours pas assez, ajouter des recettes faiblement pertinentes
        if (exactResults.length + lessRelevant.length < 8 && lowRelevance.length > 0) {
          const needed = 8 - (exactResults.length + lessRelevant.length);
          const additional = lowRelevance.slice(0, needed).map(item => item.recipe);
          lessRelevant = [...lessRelevant, ...additional];
          console.log(`[Search] ${additional.length} recettes faiblement pertinentes ajoutées`);
        }
      }
    } else if (mediumRelevance.length > 0) {
      // Pas de très pertinents, mais des moyennement pertinents : proposer uniquement ceux-là
      exactResults = mediumRelevance.map(item => item.recipe);
      console.log(`[Search] ${exactResults.length} résultats moyennement pertinents proposés (tous)`);
      
      // Si peu de résultats (≤ 5), ajouter des recettes faiblement pertinentes
      if (exactResults.length <= 5 && lowRelevance.length > 0) {
        const needed = Math.min(6, lowRelevance.length);
        lessRelevant = lowRelevance.slice(0, needed).map(item => item.recipe);
        console.log(`[Search] ${lessRelevant.length} recettes moins pertinentes ajoutées (faiblement pertinentes)`);
      }
    } else {
      // Seulement des résultats de faible pertinence : proposer ceux-là mais limiter à 8 max
      exactResults = lowRelevance.slice(0, 8).map(item => item.recipe);
      console.log(`[Search] ${exactResults.length} résultats de faible pertinence proposés (limités à 8)`);
    }

    // Si aucun résultat exact, utiliser les suggestions comme résultats
    const noExactMatch = exactResults.length === 0 && suggestions.length > 0;

    const response: SearchResponse = {
      results: noExactMatch ? suggestions : exactResults,
      suggestions: noExactMatch ? [] : suggestions,
      lessRelevant: lessRelevant, // Recettes moins pertinentes mais faisables
      meta: {
        query,
        usedIngredients: selectedIngredients,
        filters: {
          allergies: userAllergies,
          diets: userDiets,
        },
        noExactMatch,
        totalScored: scored.length,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error("[Search] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la recherche",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

