// Gestion intelligente de la liste de courses

import type { WeeklyMenu } from "./weeklyMenu";
import type { Recipe } from "./recipes";

export interface ShoppingListItem {
  name: string;
  quantity: number | null; // null si pas de quantité (sel, poivre, etc.)
  unit: string | null; // unité (g, ml, pièce, etc.)
  hasAtHome: boolean;
}

// Ingrédients qui n'ont pas besoin de quantité (on les liste juste)
const NO_QUANTITY_INGREDIENTS = [
  "sel", "poivre", "huile d'olive", "huile", "vinaigre", "citron", "citron vert",
  "herbes de provence", "basilic", "persil", "ciboulette", "coriandre", "menthe",
  "thym", "romarin", "origan", "curry", "cumin", "paprika", "curcuma", "gingembre",
  "cannelle", "vanille", "levure", "levure chimique", "levure de boulanger",
  "bicarbonate", "bicarbonate de soude", "extrait de vanille", "essence de vanille",
  "laurier", "clou de girofle", "muscade", "cardamome", "anis", "fenouil",
  "piment", "piment de cayenne", "cayenne", "harissa", "sauce soja", "sauce worcestershire",
  "moutarde", "ketchup", "mayonnaise", "cornichons", "câpres",
];

// Normaliser le nom d'un ingrédient pour le regroupement
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^\w\s]/g, " ") // Remplace la ponctuation par des espaces
    .replace(/\s+/g, " ") // Normalise les espaces
    .trim();
}

// Extraire la quantité et l'unité d'un ingrédient
// Ex: "4 œufs" -> { quantity: 4, unit: "pièce", name: "œufs" }
// Ex: "200g de farine" -> { quantity: 200, unit: "g", name: "farine" }
// Ex: "sel" -> { quantity: null, unit: null, name: "sel" }
function parseIngredient(ingredient: string): {
  name: string;
  quantity: number | null;
  unit: string | null;
} {
  const trimmed = ingredient.trim();
  if (!trimmed) {
    return { name: "", quantity: null, unit: null };
  }

  // Vérifier si c'est un ingrédient sans quantité
  const normalized = normalizeIngredientName(trimmed);
  for (const noQty of NO_QUANTITY_INGREDIENTS) {
    if (normalized.includes(noQty.toLowerCase()) || noQty.toLowerCase().includes(normalized)) {
      return { name: trimmed, quantity: null, unit: null };
    }
  }

  // Patterns pour extraire les quantités
  // Exemples: "4 œufs", "200g farine", "2 cuillères à soupe d'huile", "1/2 tasse de sucre"
  const patterns = [
    // Nombre décimal ou fraction + unité + nom
    /^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(g|kg|ml|l|cl|dl|cuillère|cuillères|c\.?à\.?s\.?|c\.?à\.?c\.?|tasse|tasses|pièce|pièces|tranche|tranches|gousse|gousses|branche|branches|feuille|feuilles|botte|bottes|tête|têtes|bouquet|bouquets)\s+(?:de\s+)?(.+)$/i,
    // Nombre seul + nom (sans unité explicite)
    /^(\d+(?:[.,]\d+)?|\d+\/\d+)\s+(?:de\s+)?(.+)$/i,
    // Nombre + nom (cas simple comme "4 œufs")
    /^(\d+)\s+(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      let quantity: number | null = null;
      let unit: string | null = null;
      let name = "";

      if (match[1]) {
        // Gérer les fractions
        if (match[1].includes("/")) {
          const [num, den] = match[1].split("/").map(Number);
          quantity = num / den;
        } else {
          quantity = parseFloat(match[1].replace(",", "."));
        }
      }

      if (match[2] && /^(g|kg|ml|l|cl|dl|cuillère|cuillères|c\.?à\.?s\.?|c\.?à\.?c\.?|tasse|tasses|pièce|pièces|tranche|tranches|gousse|gousses|branche|branches|feuille|feuilles|botte|bottes|tête|têtes|bouquet|bouquets)$/i.test(match[2])) {
        unit = match[2].toLowerCase();
        name = match[3] || "";
      } else {
        name = match[2] || match[3] || "";
      }

      // Normaliser les unités
      if (unit) {
        if (unit.includes("cuillère") || unit.includes("c.à.s") || unit.includes("cas")) {
          unit = "c.à.s";
        } else if (unit.includes("c.à.c") || unit.includes("cac")) {
          unit = "c.à.c";
        } else if (unit.includes("tasse")) {
          unit = "tasse";
        } else if (unit.includes("pièce") || unit.includes("tranche") || unit.includes("gousse") || unit.includes("branche") || unit.includes("feuille") || unit.includes("botte") || unit.includes("tête") || unit.includes("bouquet")) {
          unit = "pièce";
        }
      }

      // Si pas d'unité mais une quantité, on assume "pièce" pour les nombres entiers
      if (quantity !== null && !unit && Number.isInteger(quantity)) {
        unit = "pièce";
      }

      return {
        name: name.trim() || trimmed,
        quantity: quantity !== null && !isNaN(quantity) ? Math.round(quantity * 100) / 100 : null,
        unit: unit || null,
      };
    }
  }

  // Si aucun pattern ne correspond, c'est juste un nom d'ingrédient
  return { name: trimmed, quantity: null, unit: null };
}

// Générer une liste de courses intelligente à partir d'un menu
export function generateSmartShoppingList(
  menu: WeeklyMenu,
  recipes: Recipe[]
): ShoppingListItem[] {
  const ingredientMap = new Map<string, ShoppingListItem>();

  // Parcourir tous les repas du menu
  menu.days.forEach((day) => {
    Object.values(day.meals).forEach((meal) => {
      if (meal && meal.recipes) {
        // Parcourir toutes les recettes du repas
        meal.recipes.forEach((recipe) => {
          if (!recipe || !recipe.ingredients) return;

          // Parser chaque ingrédient
          const ingredients = recipe.ingredients.split(";");
          ingredients.forEach((ing) => {
            const parsed = parseIngredient(ing.trim());
            if (!parsed.name) return;

            const normalizedName = normalizeIngredientName(parsed.name);

            // Vérifier si on a déjà cet ingrédient
            const existing = ingredientMap.get(normalizedName);

            if (existing) {
              // Si les deux ont des quantités, on additionne
              if (existing.quantity !== null && parsed.quantity !== null) {
                // Vérifier que les unités sont compatibles
                const unitsMatch = existing.unit === parsed.unit || 
                                  (!existing.unit && !parsed.unit) ||
                                  (existing.unit && parsed.unit && 
                                   (existing.unit.includes(parsed.unit) || parsed.unit.includes(existing.unit)));
                
                if (unitsMatch) {
                  existing.quantity = (existing.quantity || 0) + parsed.quantity;
                  // Arrondir les nombres entiers
                  if (existing.quantity !== null && Number.isInteger(existing.quantity)) {
                    existing.quantity = Math.round(existing.quantity);
                  }
                  // Normaliser l'unité si nécessaire
                  if (parsed.unit && !existing.unit) {
                    existing.unit = parsed.unit;
                  }
                }
                // Si unités incompatibles, on crée un nouvel item (cas rare)
              }
              // Si l'un n'a pas de quantité, on garde null (ingrédient sans quantité)
              else if (parsed.quantity === null) {
                existing.quantity = null;
                existing.unit = null;
              }
            } else {
              // Nouvel ingrédient
              ingredientMap.set(normalizedName, {
                name: parsed.name,
                quantity: parsed.quantity,
                unit: parsed.unit,
                hasAtHome: false,
              });
            }
          });
        });
      }
    });
  });

  // Convertir en tableau et trier
  return Array.from(ingredientMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "fr")
  );
}

// Formater un ingrédient pour l'affichage
export function formatShoppingListItem(item: ShoppingListItem): string {
  // Si pas de quantité, juste le nom
  if (item.quantity === null) {
    return item.name;
  }

  // Arrondir la quantité
  let quantity = item.quantity;
  if (Number.isInteger(quantity)) {
    quantity = Math.round(quantity);
  } else {
    // Arrondir à 1 décimale max
    quantity = Math.round(quantity * 10) / 10;
  }

  let quantityStr = quantity.toString();
  // Enlever les .0 inutiles
  if (quantityStr.includes(".")) {
    quantityStr = quantityStr.replace(/\.0+$/, "");
  }

  // Formater avec l'unité
  if (item.unit) {
    // Si l'unité est "pièce", on peut dire "X œufs" au lieu de "X pièce œufs"
    if (item.unit === "pièce" && quantity === 1) {
      return item.name;
    } else if (item.unit === "pièce") {
      return `${quantityStr} ${item.name}`;
    }
    return `${quantityStr} ${item.unit} ${item.name}`;
  }

  return `${quantityStr} ${item.name}`;
}

// Filtrer la liste pour ne garder que ce qui manque
export function filterMissingItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return items.filter((item) => !item.hasAtHome);
}

