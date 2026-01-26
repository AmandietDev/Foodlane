/**
 * Parser de repas : convertit un texte libre en structure analysée
 * Utilise un dictionnaire d'aliments avec matching tolérant (accents, pluriels, fautes)
 */

// Dictionnaire d'aliments par catégorie
const FOOD_DICTIONARY: Record<string, string[]> = {
  // Protéines
  protein: [
    "poulet", "poulets", "poulet rôti", "poulet grillé",
    "viande", "viandes", "bœuf", "boeuf", "steak", "steaks",
    "porc", "jambon", "jambons", "dinde", "dindes",
    "poisson", "poissons", "saumon", "saumons", "thon", "thons",
    "œuf", "oeuf", "œufs", "oeufs", "omelette", "omelettes",
    "fromage", "fromages", "yaourt", "yaourts", "yogourt", "yogourts",
    "lentilles", "lentille", "haricots", "haricot", "haricots rouges", "haricots blancs",
    "tofu", "tofus", "tempeh", "seitan", "quorn",
    "protéine", "proteine", "protéines", "proteines"
  ],
  
  // Légumes
  veggie: [
    "salade", "salades", "laitue", "laitues",
    "tomate", "tomates", "carotte", "carottes",
    "courgette", "courgettes", "poivron", "poivrons",
    "épinard", "epinard", "épinards", "epinards",
    "brocoli", "brocolis", "chou", "choux", "chou-fleur", "choux-fleurs",
    "haricot vert", "haricots verts", "haricot verts",
    "avocat", "avocats", "concombre", "concombres",
    "oignon", "oignons", "échalote", "echalote", "échalotes", "echalotes",
    "ail", "aubergine", "aubergines", "courge", "courges",
    "patate douce", "patates douces", "betterave", "betteraves",
    "légume", "legume", "légumes", "legumes", "crudités", "crudites"
  ],
  
  // Féculents
  carb: [
    "pâtes", "pates", "pasta", "spaghetti", "spaghettis",
    "riz", "riz blanc", "riz complet", "riz basmati",
    "pain", "pains", "baguette", "baguettes", "tartine", "tartines",
    "quinoa", "boulgour", "boulghour", "couscous",
    "pomme de terre", "pommes de terre", "patate", "patates",
    "pomme de terre", "patate douce", "patates douces",
    "fécule", "féculent", "feculent", "féculents", "feculents",
    "céréale", "cereale", "céréales", "cereales", "flocons d'avoine", "flocons davoine"
  ],
  
  // Fruits
  fruit: [
    "fruit", "fruits", "pomme", "pommes", "banane", "bananes",
    "orange", "oranges", "fraise", "fraises", "raisin", "raisins",
    "kiwi", "kiwis", "mangue", "mangues", "ananas", "ananas",
    "poire", "poires", "pêche", "peche", "pêches", "peches",
    "cerise", "cerises", "myrtille", "myrtilles", "framboise", "framboises"
  ],
  
  // Produits laitiers
  dairy: [
    "lait", "lait entier", "lait demi-écrémé", "lait demiecreme",
    "fromage", "fromages", "yaourt", "yaourts", "yogourt", "yogourts",
    "fromage blanc", "fromages blancs", "crème", "creme", "crème fraîche", "creme fraiche",
    "beurre", "beurres"
  ],
  
  // Matières grasses
  fat: [
    "huile", "huiles", "huile d'olive", "huile dolive", "huile de colza",
    "beurre", "beurres", "margarine", "avocat", "avocats",
    "noix", "noisette", "noisettes", "amande", "amandes", "cacahuète", "cacahuetes"
  ],
  
  // Plaisir / Traités
  treat: [
    "chocolat", "chocolats", "gâteau", "gateau", "gâteaux", "gateaux",
    "biscuit", "biscuits", "bonbon", "bonbons", "sucre", "sucres",
    "dessert", "desserts", "glace", "glaces", "nutella",
    "fast food", "fastfood", "burger", "burgers", "frite", "frites",
    "pizza", "pizzas", "kebab", "kebabs", "macdo", "mcdonald"
  ]
};

// Allergènes courants
const ALLERGENS: Record<string, string[]> = {
  "gluten": ["blé", "ble", "froment", "seigle", "orge", "avoine", "pain", "pains", "pâtes", "pates", "pasta", "biscuit", "biscuits", "gâteau", "gateau"],
  "arachide": ["arachide", "cacahuète", "cacahuetes", "cacahuete", "peanut"],
  "lactose": ["lait", "fromage", "fromages", "yaourt", "yaourts", "crème", "creme", "beurre"],
  "œuf": ["œuf", "oeuf", "œufs", "oeufs", "omelette", "omelettes"],
  "poisson": ["poisson", "poissons", "saumon", "saumons", "thon", "thons", "sardine", "sardines"],
  "crustacés": ["crevette", "crevettes", "crabe", "crabes", "homard", "langouste"],
  "soja": ["soja", "tofu", "tofus", "tempeh", "sauce soja"]
};

// Normalisation du texte (enlever accents, minuscules, pluriels basiques)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlever accents
    .trim();
}

// Vérifier si un mot correspond à un terme du dictionnaire (matching tolérant)
function matchesFoodItem(word: string, dictionaryTerms: string[]): { matched: boolean; term?: string; confidence: number } {
  const normalizedWord = normalizeText(word);
  
  // Vérification exacte
  for (const term of dictionaryTerms) {
    const normalizedTerm = normalizeText(term);
    if (normalizedWord === normalizedTerm) {
      return { matched: true, term, confidence: 100 };
    }
  }
  
  // Vérification contient (pour les mots composés)
  for (const term of dictionaryTerms) {
    const normalizedTerm = normalizeText(term);
    if (normalizedWord.includes(normalizedTerm) || normalizedTerm.includes(normalizedWord)) {
      return { matched: true, term, confidence: 85 };
    }
  }
  
  // Vérification pluriel/singulier basique
  for (const term of dictionaryTerms) {
    const normalizedTerm = normalizeText(term);
    const wordSingular = normalizedWord.replace(/s$/, "");
    const termSingular = normalizedTerm.replace(/s$/, "");
    
    if (wordSingular === termSingular && wordSingular.length > 2) {
      return { matched: true, term, confidence: 90 };
    }
  }
  
  return { matched: false, confidence: 0 };
}

// Parser principal : convertit un texte en structure analysée
export interface ParsedMeal {
  items: Array<{
    name: string;
    category: string;
    confidence: number;
  }>;
  components: {
    protein: string[];
    veggie: string[];
    carb: string[];
    fat: string[];
    dairy: string[];
    fruit: string[];
    treat: string[];
  };
  notes: string[];
  detected_allergens: string[];
  diet_flags: string[];
}

export function parseMeal(rawText: string): ParsedMeal {
  const normalized = normalizeText(rawText);
  const words = normalized.split(/[\s,;]+/).filter(w => w.length > 0);
  
  const items: ParsedMeal["items"] = [];
  const components: ParsedMeal["components"] = {
    protein: [],
    veggie: [],
    carb: [],
    fat: [],
    dairy: [],
    fruit: [],
    treat: []
  };
  const detectedAllergens: string[] = [];
  const dietFlags: string[] = [];
  const notes: string[] = [];
  
  // Analyser chaque mot/phrase
  for (const word of words) {
    let matched = false;
    
    // Chercher dans chaque catégorie
    for (const [category, terms] of Object.entries(FOOD_DICTIONARY)) {
      const match = matchesFoodItem(word, terms);
      if (match.matched && match.term) {
        items.push({
          name: match.term,
          category,
          confidence: match.confidence
        });
        
        // Ajouter aux composants
        if (category === "protein") components.protein.push(match.term);
        else if (category === "veggie") components.veggie.push(match.term);
        else if (category === "carb") components.carb.push(match.term);
        else if (category === "fat") components.fat.push(match.term);
        else if (category === "dairy") components.dairy.push(match.term);
        else if (category === "fruit") components.fruit.push(match.term);
        else if (category === "treat") components.treat.push(match.term);
        
        matched = true;
        break;
      }
    }
    
    // Si pas trouvé, ajouter comme "unknown" avec faible confiance
    if (!matched && word.length > 2) {
      items.push({
        name: word,
        category: "unknown",
        confidence: 20
      });
    }
  }
  
  // Détecter les allergènes
  for (const [allergen, terms] of Object.entries(ALLERGENS)) {
    for (const term of terms) {
      if (normalized.includes(normalizeText(term))) {
        if (!detectedAllergens.includes(allergen)) {
          detectedAllergens.push(allergen);
        }
      }
    }
  }
  
  // Détecter les flags diététiques
  if (components.protein.length >= 2) dietFlags.push("high_protein");
  if (components.veggie.length >= 2 && components.protein.length >= 1 && components.carb.length >= 1) {
    dietFlags.push("balanced");
  }
  if (components.treat.length > 0) dietFlags.push("has_treats");
  if (components.veggie.length === 0 && components.fruit.length === 0) dietFlags.push("low_fiber");
  
  // Notes automatiques
  if (components.protein.length === 0 && components.carb.length === 0 && components.veggie.length === 0) {
    notes.push("Repas incomplet détecté");
  } else if (components.veggie.length >= 2 && components.protein.length >= 1) {
    notes.push("Repas plutôt complet");
  }
  
  // Calculer la confiance globale (moyenne des confidences des items trouvés)
  const confidence = items.length > 0
    ? Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length)
    : 0;
  
  return {
    items,
    components,
    notes,
    detected_allergens: detectedAllergens,
    diet_flags: dietFlags
  };
}

// Fonction utilitaire pour obtenir la catégorie d'un aliment
export function getFoodCategory(foodName: string): string {
  const normalized = normalizeText(foodName);
  
  for (const [category, terms] of Object.entries(FOOD_DICTIONARY)) {
    const match = matchesFoodItem(normalized, terms);
    if (match.matched) {
      return category;
    }
  }
  
  return "unknown";
}

