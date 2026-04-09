// Gestion des profils alimentaires et filtrage des recettes

export type DietaryProfile = 
  | "Normal"
  | "Végétarien"
  | "Végétalien"
  | "Pescétarien"
  | "Sans porc"
  | "Sans lactose"
  | "Sans gluten";

// Icônes/émojis pour chaque régime
export const DIETARY_PROFILE_ICONS: Record<DietaryProfile, string> = {
  "Normal": "🍽️",
  "Végétarien": "🥬",
  "Végétalien": "🌱",
  "Pescétarien": "🐟",
  "Sans porc": "🚫🐷",
  "Sans lactose": "🥛❌",
  "Sans gluten": "🌾❌",
};

// Régimes gratuits (accessibles en version gratuite)
export const FREE_DIETARY_PROFILES: DietaryProfile[] = [
  "Normal",
  "Végétarien",
];

// Régimes premium (réservés aux comptes premium)
export const PREMIUM_DIETARY_PROFILES: DietaryProfile[] = [
  "Végétalien",
  "Pescétarien",
  "Sans porc",
  "Sans lactose",
  "Sans gluten",
];

// Tous les régimes disponibles
export const ALL_DIETARY_PROFILES: DietaryProfile[] = [
  ...FREE_DIETARY_PROFILES,
  ...PREMIUM_DIETARY_PROFILES,
];

/**
 * Vérifie si un régime est accessible avec l'abonnement actuel
 */
export function isDietaryProfileAvailable(
  profile: DietaryProfile,
  subscriptionType: "free" | "premium"
): boolean {
  if (subscriptionType === "premium") {
    return true; // Premium a accès à tout
  }
  return FREE_DIETARY_PROFILES.includes(profile);
}

/**
 * Liste des ingrédients à exclure selon le régime alimentaire
 */
export const DIETARY_EXCLUSIONS: Record<DietaryProfile, string[]> = {
  "Normal": [],
  "Végétarien": ["viande", "porc", "bœuf", "poulet", "agneau", "jambon", "bacon", "lardons", "saucisse", "poisson", "thon", "saumon", "cabillaud", "crevettes", "moules"],
  "Végétalien": ["viande", "porc", "bœuf", "poulet", "agneau", "jambon", "bacon", "lardons", "saucisse", "poisson", "thon", "saumon", "cabillaud", "crevettes", "moules", "lait", "yaourt", "fromage", "beurre", "crème", "œufs", "œuf", "oeufs", "oeuf"],
  "Pescétarien": ["viande", "porc", "bœuf", "poulet", "agneau", "jambon", "bacon", "lardons", "saucisse"],
  "Sans porc": ["porc", "jambon", "bacon", "lardons", "saucisse", "chorizo"],
  "Sans lactose": ["lait", "yaourt", "fromage", "beurre", "crème", "crème fraîche", "mozzarella", "parmesan", "emmental", "comté", "gruyère", "brie", "camembert", "feta", "chèvre"],
  "Sans gluten": [
    "blé", "ble", "farine", "farines",
    "pâtes", "pates", "pâte", "pate",
    "pâte feuilletée", "pate feuilletee", "feuilletée", "feuilletee",
    "pâte sablée", "pate sablee", "sablée", "sablee",
    "pâte brisée", "pate brisee", "brisée", "brisee",
    "pâte à pizza", "pate a pizza", "pizza",
    "pain", "pains",
    "semoule", "semoules",
    "boulgour", "bulgur",
    "orge",
    "seigle",
    "avoine",
    "épeautre", "epeautre",
    "kamut",
    "triticale",
    "biscotte", "biscottes",
    "chapelure",
    "panure",
    "gnocchi",
    "ravioli", "raviolis",
    "lasagne", "lasagnes",
    "canelloni",
    "spaghetti",
    "tagliatelle",
    "fettuccine",
    "penne",
    "fusilli",
    "couscous",
    "biscuit", "biscuits",
    "gâteau", "gateau", "gâteaux", "gateaux",
    "tarte", "tartes",
    "quiche",
    "crêpe", "crepe", "crêpes", "crepes",
    "gaufre", "gaufres",
    "beignet", "beignets",
    "brioche",
    "croissant", "croissants",
    "baguette",
    "biscuit apéritif", "biscuits apéritifs",
    "crackers",
  ],
};

/**
 * Liste des allergènes courants à rechercher dans les recettes
 */
export const COMMON_ALLERGENS = [
  "arachides",
  "cacahuètes",
  "noix",
  "amandes",
  "noisettes",
  "noix de cajou",
  "pistaches",
  "fruits à coque",
  "lactose",
  "gluten",
  "blé",
  "œufs",
  "œuf",
  "oeufs",
  "oeuf",
  "poisson",
  "crustacés",
  "soja",
  "sésame",
  "moutarde",
  "céléri",
  "lupin",
];

/**
 * Filtre les recettes selon les régimes et allergies de l'utilisateur
 */
export function filterRecipesByDietaryProfile<T extends { ingredients: string | null }>(
  recipes: T[],
  dietaryProfiles: DietaryProfile[],
  allergies: string[]
): T[] {
  if (dietaryProfiles.length === 0 && allergies.length === 0) {
    return recipes; // Pas de filtrage si aucun régime/allergie
  }

  // Collecter tous les ingrédients à exclure
  const excludedIngredients: string[] = [];

  // Ajouter les exclusions selon les régimes
  for (const profile of dietaryProfiles) {
    const exclusions = DIETARY_EXCLUSIONS[profile] || [];
    excludedIngredients.push(...exclusions);
  }

  // Ajouter les allergies (en minuscules pour la recherche)
  for (const allergy of allergies) {
    excludedIngredients.push(allergy.toLowerCase().trim());
  }

  // Normaliser les ingrédients exclus (en minuscules)
  const normalizedExclusions = excludedIngredients
    .map(ing => ing.toLowerCase().trim())
    .filter(ing => ing.length > 0);

  if (normalizedExclusions.length === 0) {
    return recipes;
  }

  // Filtrer les recettes
  return recipes.filter((recipe) => {
    const ingredientsText = (recipe.ingredients || "").toLowerCase();

    // Vérifier qu'aucun ingrédient exclu n'est présent
    for (const exclusion of normalizedExclusions) {
      // Recherche insensible à la casse avec des limites de mot
      const regex = new RegExp(`\\b${exclusion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(ingredientsText)) {
        return false; // Recette exclue
      }
    }

    return true; // Recette compatible
  });
}

/**
 * Filtre les recettes selon les équipements disponibles de l'utilisateur
 */
export function filterRecipesByEquipment<T extends { equipements: string | null }>(
  recipes: T[],
  availableEquipment: string[]
): T[] {
  if (availableEquipment.length === 0) {
    // Si aucun équipement n'est sélectionné, on retourne toutes les recettes
    // (on suppose que l'utilisateur a au minimum un four ou peut adapter)
    return recipes;
  }

  // Normaliser les équipements disponibles (en minuscules)
  const normalizedAvailable = availableEquipment.map(eq => eq.toLowerCase().trim());

  return recipes.filter((recipe) => {
    if (!recipe.equipements || recipe.equipements.trim().length === 0) {
      // Si la recette n'a pas d'équipements requis, elle est compatible
      return true;
    }

    // Extraire les équipements requis de la recette (séparés par ;)
    const requiredEquipment = recipe.equipements
      .split(';')
      .map(eq => eq.trim().toLowerCase())
      .filter(eq => eq.length > 0);

    if (requiredEquipment.length === 0) {
      // Pas d'équipements requis, recette compatible
      return true;
    }

    // Vérifier que tous les équipements requis sont disponibles
    // Si au moins un équipement requis n'est pas disponible, on exclut la recette
    for (const required of requiredEquipment) {
      const isAvailable = normalizedAvailable.some(available => {
        // Recherche flexible : "Four" correspond à "four", "Four traditionnel", etc.
        return available.includes(required) || required.includes(available);
      });
      
      if (!isAvailable) {
        return false; // Au moins un équipement requis n'est pas disponible
      }
    }

    return true; // Tous les équipements requis sont disponibles
  });
}

/**
 * Normalise un texte pour la recherche (supprime accents, met en minuscule)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .trim();
}

/**
 * Détecte automatiquement les badges diététiques d'une recette en analysant ses ingrédients
 */
export function detectDietaryBadges(recipe: { ingredients: string | null }): DietaryProfile[] {
  if (!recipe.ingredients || recipe.ingredients.trim().length === 0) {
    return [];
  }

  const ingredientsText = normalizeText(recipe.ingredients);
  const badges: DietaryProfile[] = [];

  // Vérifier chaque régime alimentaire
  for (const [profile, exclusions] of Object.entries(DIETARY_EXCLUSIONS)) {
    // "Normal" n'a pas de badge spécifique
    if (profile === "Normal") continue;

    // Vérifier qu'aucun ingrédient exclu n'est présent
    let isCompatible = true;
    for (const exclusion of exclusions) {
      const normalizedExclusion = normalizeText(exclusion);
      if (normalizedExclusion.length === 0) continue;

      // Pour "Sans gluten", on doit être très strict : si on trouve un ingrédient contenant du gluten,
      // on exclut automatiquement le badge, même si c'est "farine de riz" (par précaution)
      let regex: RegExp;
      if (profile === "Sans gluten") {
        // Pour le gluten, recherche stricte : on cherche le mot entier dans les ingrédients
        // Si on trouve "farine", "pâtes", "pâte", etc., on exclut le badge par sécurité
        const escaped = normalizedExclusion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Recherche le mot entier (avec limites de mot pour éviter les faux positifs)
        // Ex: "farine" détecte "farine", "farine de blé", "farine de riz", "pâte feuilletée", etc.
        regex = new RegExp(`\\b${escaped}\\b`, 'i');
      } else {
        // Pour les autres régimes, recherche flexible
        regex = new RegExp(
          `\\b${normalizedExclusion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*\\b|\\b\\w*${normalizedExclusion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
          'i'
        );
      }
      
      if (regex.test(ingredientsText)) {
        isCompatible = false;
        break;
      }
    }

    if (isCompatible) {
      badges.push(profile as DietaryProfile);
    }
  }

  return badges;
}

/**
 * Icônes pour les badges diététiques
 */
export const DIETARY_BADGE_ICONS: Record<DietaryProfile, string> = {
  "Normal": "🍽️",
  "Végétarien": "🥬",
  "Végétalien": "🌱",
  "Pescétarien": "🐟",
  "Sans porc": "🚫🐷",
  "Sans lactose": "🥛❌",
  "Sans gluten": "🌾❌",
};

