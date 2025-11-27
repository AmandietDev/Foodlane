// Base de données des conseils nutritionnels par objectif

export type NutritionGoal = 
  | "weight-loss"
  | "muscle-gain"
  | "rebalancing"
  | "diabetes"
  | "cholesterol"
  | "digestion"
  | "vegetarian"
  | "energy"
  | "hypertension"
  | "sleep-stress";

export type EquivalenceCategory = 
  | "féculents"
  | "protéines"
  | "matières-grasses"
  | "boissons"
  | "snacks"
  | "desserts"
  | "général";

export type NutritionEquivalence = {
  baseFood: string;
  substitute: string;
  baseQuantity: string;
  substituteQuantity: string;
  interest: string;
  context?: string; // petit-déjeuner, collation, repas, apéro...
  keywords: string[];
};

export type NutritionGoalData = {
  id: NutritionGoal;
  title: string;
  icon: string;
  keyPrinciples: string[];
  equivalences: Record<EquivalenceCategory, NutritionEquivalence[]>;
  warning?: string; // Pour le diabète notamment
};

export const NUTRITION_GOALS: Record<NutritionGoal, NutritionGoalData> = {
  "weight-loss": {
    id: "weight-loss",
    title: "Perte de poids",
    icon: "📉",
    keyPrinciples: [
      "Priorité à la satiété",
      "Densité énergétique plus basse (plus de volume, moins de kcal par bouchée)",
      "Maintenir les protéines à chaque repas pour limiter la perte musculaire",
      "Travailler sur la qualité des glucides et des graisses (IG, fibres, AGPI AGMI)",
    ],
    equivalences: {
      "féculents": [
        {
          baseFood: "Riz blanc",
          substitute: "Riz basmati complet ou légumineuses mélangées",
          baseQuantity: "60 g riz blanc cru",
          substituteQuantity: "50 g riz basmati complet + 20 g lentilles corail",
          interest: "Plus de fibres, meilleure satiété, IG plus bas",
          keywords: ["riz", "riz blanc", "riz standard"],
        },
        {
          baseFood: "Pâtes blanches",
          substitute: "Pâtes complètes ou aux légumineuses",
          baseQuantity: "70 g pâtes blanches",
          substituteQuantity: "70 g pâtes complètes ou pois chiches",
          interest: "Plus de protéines et fibres, meilleure satiété",
          keywords: ["pâtes", "pâtes blanches", "pâtes classiques"],
        },
        {
          baseFood: "Purée de pommes de terre au beurre",
          substitute: "Purée pommes de terre + légumes",
          baseQuantity: "200 g purée classique",
          substituteQuantity: "150 g pommes de terre + 50 g carottes ou courgettes + 1 c. à café d'huile d'olive (au lieu de beurre)",
          interest: "Plus de volume pour moins de calories",
          keywords: ["purée", "purée pommes de terre", "purée beurre"],
        },
      ],
      "matières-grasses": [
        {
          baseFood: "Beurre de cuisson",
          substitute: "Huile d'olive ou colza",
          baseQuantity: "10 g beurre",
          substituteQuantity: "7-8 g huile",
          interest: "Moins de graisses saturées, meilleure qualité lipidique",
          keywords: ["beurre", "beurre cuisson", "beurre de cuisson"],
        },
        {
          baseFood: "Crème fraîche",
          substitute: "Yaourt grec ou fromage blanc",
          baseQuantity: "100 ml crème entière",
          substituteQuantity: "100 g yaourt grec 5% ou fromage blanc",
          interest: "Moins de gras, plus de protéines",
          keywords: ["crème", "crème fraîche", "crème entière"],
        },
      ],
      "desserts": [
        {
          baseFood: "Crème dessert industrielle",
          substitute: "Yaourt nature + toppings",
          baseQuantity: "1 crème dessert",
          substituteQuantity: "1 yaourt nature + 1 c. à café de miel + 1 petite poignée de fruits",
          interest: "Moins de sucre, plus de protéines, plus de fibres",
          keywords: ["crème dessert", "dessert industriel", "dessert"],
        },
        {
          baseFood: "Viennoiserie",
          substitute: "Pain + garniture",
          baseQuantity: "1 croissant",
          substituteQuantity: "1 tranche de pain complet + 10 g purée d'amande + 1 fruit",
          interest: "Plus rassasiant, moins de graisses saturées",
          context: "petit-déjeuner",
          keywords: ["croissant", "viennoiserie", "brioche", "pain au chocolat"],
        },
        {
          baseFood: "Glace crème",
          substitute: "\"Nice cream\" banane",
          baseQuantity: "100 g glace",
          substituteQuantity: "100 g banane congelée mixée + un peu de lait",
          interest: "Sucre venant du fruit, pas de graisses ajoutées",
          keywords: ["glace", "crème glacée", "glace crème"],
        },
      ],
      "snacks": [],
      "protéines": [],
      "boissons": [],
      "général": [
        {
          baseFood: "Repas sans légumes",
          substitute: "Repas avec ½ assiette de légumes",
          baseQuantity: "Repas standard",
          substituteQuantity: "Repas + légumes (½ assiette)",
          interest: "Plus de volume, plus de fibres, meilleure satiété",
          context: "repas",
          keywords: ["légumes", "repas", "assiette"],
        },
        {
          baseFood: "Repas sans protéines",
          substitute: "Repas avec protéines",
          baseQuantity: "Repas standard",
          substituteQuantity: "Repas + protéines (œufs, poissons, produits laitiers, légumineuses, tofu...)",
          interest: "Limite la perte musculaire, meilleure satiété",
          context: "repas",
          keywords: ["protéines", "repas"],
        },
        {
          baseFood: "Produits ultra transformés",
          substitute: "Préparations maison simplifiées",
          baseQuantity: "Produit industriel",
          substituteQuantity: "Version maison simple",
          interest: "Moins de sel, moins de graisses cachées, meilleur contrôle des ingrédients",
          keywords: ["produit transformé", "industriel", "préparé"],
        },
        {
          baseFood: "Boissons sucrées",
          substitute: "Eau, eaux aromatisées maison, thé, café sans sucre",
          baseQuantity: "Boisson sucrée",
          substituteQuantity: "Eau ou boisson non sucrée",
          interest: "Réduction majeure des sucres et calories",
          keywords: ["soda", "boisson sucrée", "jus"],
        },
      ],
    },
  },

  "muscle-gain": {
    id: "muscle-gain",
    title: "Prise de masse musculaire",
    icon: "💪",
    keyPrinciples: [
      "Apport protéique suffisant réparti sur la journée",
      "Ne pas avoir peur des glucides complexes (énergie pour s'entraîner)",
      "Avoir un léger surplus calorique contrôlé",
      "Favoriser des sources de graisses de bonne qualité",
    ],
    equivalences: {
      "protéines": [
        {
          baseFood: "Jambon blanc seul",
          substitute: "Jambon + féculent",
          baseQuantity: "2 tranches de jambon seules",
          substituteQuantity: "2 tranches + 60 g de riz ou pâtes complètes",
          interest: "Meilleure construction musculaire grâce aux glucides + protéines",
          keywords: ["jambon", "jambon blanc", "protéine seule"],
        },
        {
          baseFood: "Yaourt nature simple",
          substitute: "Yaourt \"boosté\"",
          baseQuantity: "1 yaourt nature",
          substituteQuantity: "1 yaourt + 1 c. à soupe de poudre de lait ou skyr + 1 poignée de muesli",
          interest: "Plus de protéines et calories de qualité",
          context: "collation",
          keywords: ["yaourt", "yaourt nature"],
        },
        {
          baseFood: "Poisson pané industriel",
          substitute: "Poisson frais + panure maison",
          baseQuantity: "100 g poisson pané",
          substituteQuantity: "120 g poisson frais + panure flocons d'avoine, cuisson au four",
          interest: "Plus de protéines, moins de graisses de mauvaise qualité",
          keywords: ["poisson", "poisson pané", "poisson industriel"],
        },
      ],
      "féculents": [
        {
          baseFood: "Salade verte seule",
          substitute: "\"Salade complète\"",
          baseQuantity: "Salade = légumes uniquement",
          substituteQuantity: "Légumes + féculent (quinoa, pâtes complètes, riz) + protéines",
          interest: "Vrai repas complet utile pour la prise de masse",
          context: "repas",
          keywords: ["salade", "salade verte", "salade seule"],
        },
        {
          baseFood: "Pain blanc",
          substitute: "Pain complet ou aux graines",
          baseQuantity: "40 g baguette",
          substituteQuantity: "40 g pain complet ou seigle",
          interest: "Meilleure glycémie, plus de fibres",
          keywords: ["pain", "pain blanc", "baguette"],
        },
      ],
      "snacks": [
        {
          baseFood: "Barre chocolatée",
          substitute: "Collation maison",
          baseQuantity: "1 barre",
          substituteQuantity: "1 banane + 20 g de noix + 1 yaourt",
          interest: "Plus de micronutriments, meilleure qualité énergétique",
          context: "collation",
          keywords: ["barre", "barre chocolatée", "barre sucrée"],
        },
        {
          baseFood: "Milk-shake industriel",
          substitute: "Smoothie protéiné maison",
          baseQuantity: "Verre de milkshake",
          substituteQuantity: "Lait ou boisson soja + fruit + skyr ou poudre de lait",
          interest: "Plus de protéines, moins de sucres ajoutés",
          context: "collation",
          keywords: ["milkshake", "milkshake industriel", "shake"],
        },
      ],
      "matières-grasses": [],
      "boissons": [],
      "desserts": [],
      "général": [],
    },
  },

  "rebalancing": {
    id: "rebalancing",
    title: "Rééquilibrage alimentaire",
    icon: "🔄",
    keyPrinciples: [
      "Remettre structure et régularité dans les repas",
      "Varier les familles d'aliments",
      "Limiter les extrêmes (restriction ou excès)",
      "Prioriser le fait maison simple plutôt que \"tout parfait\"",
    ],
    equivalences: {
      "général": [
        {
          baseFood: "\"Je saute le petit-déjeuner\"",
          substitute: "\"Petit-déjeuner simple\"",
          baseQuantity: "Rien le matin",
          substituteQuantity: "1 produit céréalier + 1 produit laitier + 1 fruit",
          interest: "Limite les fringales et les grignotages",
          context: "petit-déjeuner",
          keywords: ["petit-déjeuner", "sauter repas", "sans petit-déjeuner"],
        },
        {
          baseFood: "Plat préparé",
          substitute: "Assiette simple maison",
          baseQuantity: "1 plat préparé",
          substituteQuantity: "1 portion de féculents + 1 portion de légumes + 1 portion de protéines (ex: pâtes + sauce tomate maison + thon + légumes)",
          interest: "Moins de sel, moins de graisses cachées",
          context: "repas",
          keywords: ["plat préparé", "plat industriel", "plat tout prêt"],
        },
        {
          baseFood: "Sandwich charcuterie",
          substitute: "Sandwich équilibré",
          baseQuantity: "Pain blanc + saucisson",
          substituteQuantity: "Pain complet + poulet ou thon + crudités + un peu de fromage ou houmous",
          interest: "Protéines de bonne qualité + légumes + fibres",
          context: "repas",
          keywords: ["sandwich", "sandwich charcuterie", "sandwich saucisson"],
        },
      ],
      "snacks": [
        {
          baseFood: "Paquet de biscuits",
          substitute: "Portion de biscuits + fruit + boisson",
          baseQuantity: "4 biscuits",
          substituteQuantity: "2 biscuits + 1 fruit + verre d'eau ou tisane",
          interest: "Quantité maîtrisée, meilleure satiété",
          context: "collation",
          keywords: ["biscuits", "paquet biscuits", "grignotage"],
        },
        {
          baseFood: "Chips",
          substitute: "Pois chiches rôtis ou fruits à coque",
          baseQuantity: "30 g chips",
          substituteQuantity: "15-20 g noix ou amandes",
          interest: "Graisses de meilleure qualité, plus rassasiant",
          context: "apéro",
          keywords: ["chips", "chips pommes de terre"],
        },
      ],
      "féculents": [],
      "protéines": [],
      "matières-grasses": [],
      "boissons": [],
      "desserts": [],
    },
  },

  "diabetes": {
    id: "diabetes",
    title: "Équilibrer son diabète",
    icon: "🍬",
    keyPrinciples: [
      "Répartition des glucides sur la journée",
      "Choisir des glucides à IG plus bas et riches en fibres",
      "Associer glucides + protéines + lipides de bonne qualité pour limiter les pics",
      "Attention aux boissons sucrées et sucres \"cachés\"",
    ],
    warning: "Les conseils proposés sont généraux et ne remplacent pas un suivi personnalisé par un professionnel de santé.",
    equivalences: {
      "féculents": [
        {
          baseFood: "Pain blanc",
          substitute: "Pain complet / seigle / aux céréales",
          baseQuantity: "40 g baguette",
          substituteQuantity: "40 g pain complet",
          interest: "IG plus bas, meilleure courbe glycémique",
          keywords: ["pain", "pain blanc", "baguette"],
        },
        {
          baseFood: "Riz blanc cuisson rapide",
          substitute: "Riz basmati complet ou quinoa",
          baseQuantity: "60 g riz cuisson rapide",
          substituteQuantity: "60 g riz basmati complet ou quinoa",
          interest: "Feutrage de la glycémie grâce aux fibres",
          keywords: ["riz", "riz blanc", "riz cuisson rapide"],
        },
        {
          baseFood: "Purée de pomme de terre",
          substitute: "Pomme de terre vapeur + filet d'huile",
          baseQuantity: "200 g purée",
          substituteQuantity: "200 g pommes de terre vapeur + 1 c. à café huile + légumes",
          interest: "IG plus bas, plus de mastication",
          keywords: ["purée", "purée pommes de terre"],
        },
      ],
      "boissons": [
        {
          baseFood: "Jus de fruit",
          substitute: "Fruit entier",
          baseQuantity: "200 ml jus",
          substituteQuantity: "1 fruit + verre d'eau",
          interest: "Fibres, glycémie plus lissée",
          keywords: ["jus", "jus de fruit", "jus d'orange"],
        },
      ],
      "desserts": [
        {
          baseFood: "Yaourt sucré",
          substitute: "Yaourt nature + fruit frais",
          baseQuantity: "1 yaourt aux fruits",
          substituteQuantity: "1 yaourt nature + ½ fruit frais + cannelle",
          interest: "Moins de sucres ajoutés",
          keywords: ["yaourt", "yaourt sucré", "yaourt aux fruits"],
        },
        {
          baseFood: "Dessert sucré chaque jour",
          substitute: "Alternance dessert sucré / fruit / yaourt",
          baseQuantity: "7 jours de dessert sucré",
          substituteQuantity: "2-3 desserts sucrés + 2 fruits + 2 yaourts nature",
          interest: "Charge glycémique globale réduite",
          keywords: ["dessert", "dessert sucré", "dessert quotidien"],
        },
      ],
      "général": [
        {
          baseFood: "Plat de pâtes seules",
          substitute: "Pâtes + légumes + protéines",
          baseQuantity: "Pâtes + beurre",
          substituteQuantity: "Pâtes complètes + courgettes + poulet",
          interest: "Structure du repas : glucides complexes + protéines + légumes + graisses de qualité pour stabiliser la glycémie",
          context: "repas",
          keywords: ["pâtes", "pâtes seules", "repas"],
        },
      ],
      "snacks": [],
      "protéines": [],
      "matières-grasses": [],
    },
  },

  "cholesterol": {
    id: "cholesterol",
    title: "Baisser le cholestérol",
    icon: "❤️",
    keyPrinciples: [
      "Réduire les graisses saturées (charcuteries, fromages gras, beurre en excès)",
      "Augmenter les fibres solubles (avoine, légumineuses, fruits, légumes)",
      "Augmenter les AGPI et AGMI (huile colza, olive, noix, poissons gras)",
    ],
    equivalences: {
      "matières-grasses": [
        {
          baseFood: "Beurre tartine",
          substitute: "Purée d'oléagineux ou avocat",
          baseQuantity: "10 g beurre",
          substituteQuantity: "10 g purée d'amande/noisette ou 20 g avocat",
          interest: "Plus d'AGMI/AGPI, moins de saturés",
          context: "petit-déjeuner",
          keywords: ["beurre", "beurre tartine", "tartine"],
        },
        {
          baseFood: "Crème fraîche entière",
          substitute: "Crème végétale ou yaourt",
          baseQuantity: "100 ml crème",
          substituteQuantity: "100 ml crème soja cuisine ou 100 g yaourt grec",
          interest: "Moins de graisses saturées",
          keywords: ["crème", "crème fraîche", "crème entière"],
        },
        {
          baseFood: "Fromages gras",
          substitute: "Fromages plus légers",
          baseQuantity: "40 g camembert ou raclette",
          substituteQuantity: "30 g de fromage à 20-25% MG ou 30 g de feta",
          interest: "Baisse de l'apport en saturés",
          keywords: ["fromage", "fromage gras", "camembert", "raclette"],
        },
      ],
      "protéines": [
        {
          baseFood: "Viandes rouges grasses",
          substitute: "Volailles / poissons / légumineuses",
          baseQuantity: "150 g steak",
          substituteQuantity: "150 g blanc de poulet ou 150 g poisson ou 120 g lentilles cuites",
          interest: "Profil lipidique plus favorable",
          keywords: ["viande", "steak", "viande rouge", "bœuf"],
        },
        {
          baseFood: "Charcuterie",
          substitute: "Jambon découenné / tofu / houmous",
          baseQuantity: "2 tranches de saucisson",
          substituteQuantity: "2 tranches de jambon ou 40 g houmous + crudités",
          interest: "Moins de graisses saturées, plus de fibres (version végétale)",
          keywords: ["charcuterie", "saucisson", "charcuterie grasse"],
        },
      ],
      "féculents": [
        {
          baseFood: "Céréales raffinées",
          substitute: "Avoine / orge / seigle",
          baseQuantity: "40 g céréales sucrées",
          substituteQuantity: "40 g flocons d'avoine",
          interest: "Fibres solubles, effet sur cholestérol LDL",
          context: "petit-déjeuner",
          keywords: ["céréales", "céréales sucrées", "céréales raffinées"],
        },
        {
          baseFood: "Absence de légumineuses",
          substitute: "Légumineuses 2-3 fois/semaine",
          baseQuantity: "0 portion",
          substituteQuantity: "Intégrer lentilles, pois chiches, haricots dans salades, plats chauds",
          interest: "Effet sur cholestérol et satiété",
          keywords: ["légumineuses", "lentilles", "pois chiches", "haricots"],
        },
      ],
      "snacks": [],
      "boissons": [],
      "desserts": [],
      "général": [],
    },
  },

  "digestion": {
    id: "digestion",
    title: "Améliorer la digestion et le confort intestinal",
    icon: "🌿",
    keyPrinciples: [
      "Augmenter progressivement les fibres (sans exploser tout d'un coup)",
      "Favoriser les fibres solubles (avoine, fruits, légumes cuits, légumineuses bien préparées)",
      "Bien répartir l'hydratation sur la journée",
      "Limiter les aliments très gras, très sucrés, ultra transformés qui irritent parfois le tube digestif",
    ],
    equivalences: {
      "féculents": [
        {
          baseFood: "Pain blanc",
          substitute: "Pain complet ou aux céréales",
          baseQuantity: "40 g pain blanc",
          substituteQuantity: "40 g pain complet",
          interest: "Plus de fibres, meilleure régularité du transit",
          keywords: ["pain", "pain blanc", "baguette"],
        },
        {
          baseFood: "Céréales sucrées du matin",
          substitute: "Flocons d'avoine",
          baseQuantity: "40 g céréales sucrées",
          substituteQuantity: "40 g flocons d'avoine",
          interest: "Fibres solubles (bêta-glucanes), bon pour transit et satiété",
          context: "petit-déjeuner",
          keywords: ["céréales", "céréales sucrées", "céréales petit déjeuner"],
        },
      ],
      "général": [
        {
          baseFood: "Légumes crus difficiles à digérer",
          substitute: "Légumes cuits",
          baseQuantity: "Grande salade crue le soir",
          substituteQuantity: "Légumes cuits vapeur ou mijotés (ex: carottes, courgettes, fenouil, poireaux cuits)",
          interest: "Moins irritant, plus digeste, toujours riche en fibres",
          context: "repas",
          keywords: ["légumes", "légumes crus", "crudités", "salade crue"],
        },
        {
          baseFood: "Légumineuses \"qui ballonnent\"",
          substitute: "Légumineuses mieux préparées",
          baseQuantity: "100 g lentilles cuites \"classiques\"",
          substituteQuantity: "100 g lentilles cuites après trempage et rinçage",
          interest: "Moins de fermentation, meilleure tolérance",
          keywords: ["lentilles", "légumineuses", "ballonnements"],
        },
        {
          baseFood: "Pois chiches entiers",
          substitute: "Houmous ou purée de pois chiches",
          baseQuantity: "100 g pois chiches entiers",
          substituteQuantity: "40-50 g houmous",
          interest: "Texture plus douce, souvent mieux tolérée",
          keywords: ["pois chiches", "légumineuses"],
        },
      ],
      "desserts": [
        {
          baseFood: "Crème dessert grasse",
          substitute: "Yaourt nature + compote",
          baseQuantity: "1 crème dessert",
          substituteQuantity: "1 yaourt nature + 2-3 c. à soupe de compote",
          interest: "Moins gras, plus de fibres, plus digeste (pour beaucoup de gens)",
          keywords: ["crème dessert", "dessert gras", "dessert lourd"],
        },
      ],
      "snacks": [],
      "protéines": [],
      "matières-grasses": [],
      "boissons": [],
    },
  },

  "vegetarian": {
    id: "vegetarian",
    title: "Alimentation végétarienne équilibrée",
    icon: "🌱",
    keyPrinciples: [
      "Assurer des apports protéiques suffisants",
      "Varier les sources (légumineuses, soja, œufs, produits laitiers, oléagineux)",
      "Penser au duo féculent + légumineuse pour les acides aminés",
    ],
    equivalences: {
      "protéines": [
        {
          baseFood: "Poulet / viande",
          substitute: "Légumineuses + céréales",
          baseQuantity: "100 g blanc de poulet",
          substituteQuantity: "150 g de mélange lentilles + riz (par ex 80 g lentilles cuites + 70 g riz cuit)",
          interest: "Protéines + glucides complexes + fibres",
          keywords: ["poulet", "viande", "blanc de poulet", "protéine animale"],
        },
        {
          baseFood: "Haché bœuf",
          substitute: "Soja texturé ou tofu",
          baseQuantity: "100 g bœuf haché",
          substituteQuantity: "40 g protéines de soja texturées sèches (PST) réhydratées",
          interest: "Riche en protéines, très peu de graisses",
          keywords: ["bœuf", "bœuf haché", "viande hachée", "steak haché"],
        },
        {
          baseFood: "Haché bœuf",
          substitute: "Tofu ferme émietté mariné",
          baseQuantity: "100 g bœuf haché",
          substituteQuantity: "120 g de tofu ferme émietté mariné",
          interest: "Protéines, AGPI, profil lipidique plus intéressant",
          keywords: ["bœuf", "bœuf haché", "viande hachée", "steak haché"],
        },
        {
          baseFood: "Charcuterie",
          substitute: "Alternatives végétariennes",
          baseQuantity: "2 tranches de saucisson",
          substituteQuantity: "Tartine houmous + crudités",
          interest: "Moins de graisses saturées et sel, plus de fibres",
          keywords: ["charcuterie", "saucisson", "charcuterie grasse"],
        },
        {
          baseFood: "Bacon dans une salade",
          substitute: "Tofu fumé en dés ou tempeh mariné",
          baseQuantity: "30 g bacon",
          substituteQuantity: "40 g tofu fumé",
          interest: "Goût fumé + protéines végétales",
          context: "repas",
          keywords: ["bacon", "lardons", "charcuterie"],
        },
      ],
      "féculents": [],
      "matières-grasses": [],
      "boissons": [],
      "snacks": [],
      "desserts": [],
      "général": [],
    },
  },

  "energy": {
    id: "energy",
    title: "Énergie et fatigue (vitalité au quotidien)",
    icon: "⚡",
    keyPrinciples: [
      "Stabiliser la glycémie (éviter gros pics puis gros creux)",
      "Apporter des glucides complexes + protéines régulièrement",
      "Ne pas négliger le petit-déjeuner ni les collations stratégiques",
    ],
    equivalences: {
      "général": [
        {
          baseFood: "Petit-déjeuner sucré mais pauvre en protéines",
          substitute: "Petit-déjeuner plus complet",
          baseQuantity: "Bol de céréales sucrées + jus",
          substituteQuantity: "Flocons d'avoine + lait ou boisson soja + fruit (40 g flocons + 200 ml lait + 1 fruit)",
          interest: "Plus de protéines, fibres, énergie plus stable",
          context: "petit-déjeuner",
          keywords: ["petit-déjeuner", "céréales", "céréales sucrées", "petit déjeuner"],
        },
        {
          baseFood: "Repas très légers",
          substitute: "Repas complets",
          baseQuantity: "Salade uniquement légumes",
          substituteQuantity: "Salade complète : salade + féculent (quinoa, pâtes complètes) + protéines (œufs, pois chiches, thon, tofu...)",
          interest: "Évite le coup de pompe et le grignotage 2h après",
          context: "repas",
          keywords: ["salade", "salade verte", "repas léger", "repas insuffisant"],
        },
      ],
      "snacks": [
        {
          baseFood: "Grignotage sucré",
          substitute: "Collation équilibrée",
          baseQuantity: "Barre chocolatée",
          substituteQuantity: "Fruit + oléagineux (1 banane + 10-15 g d'amandes ou noix)",
          interest: "Énergie mieux étalée, moins d'appel au sucre derrière",
          context: "collation",
          keywords: ["barre", "barre chocolatée", "grignotage", "collation sucrée"],
        },
        {
          baseFood: "Biscuit sec seul",
          substitute: "Yaourt + fruit",
          baseQuantity: "2 biscuits seuls",
          substituteQuantity: "1 biscuit + 1 yaourt + 1 fruit",
          interest: "Protéines + fibres → moins de coups de fatigue",
          context: "collation",
          keywords: ["biscuit", "biscuits", "collation"],
        },
      ],
      "féculents": [],
      "protéines": [],
      "matières-grasses": [],
      "boissons": [],
      "desserts": [],
    },
  },

  "hypertension": {
    id: "hypertension",
    title: "Hypertension (baisser la tension)",
    icon: "🧂",
    keyPrinciples: [
      "Réduire le sel ajouté et caché",
      "Choisir des aliments naturellement riches en potassium (fruits, légumes)",
      "Limiter charcuteries, plats préparés, fromages très salés",
    ],
    warning: "Ces conseils ne remplacent pas un suivi médical ni un traitement.",
    equivalences: {
      "général": [
        {
          baseFood: "Bouillon cube salé",
          substitute: "Bouillon réduit en sel + herbes",
          baseQuantity: "1 cube standard",
          substituteQuantity: "1 cube \"réduit en sel\" + herbes (laurier, thym) + ail/oignon",
          interest: "Moins de sodium pour le même goût perçu",
          keywords: ["bouillon", "bouillon cube", "cube", "sel"],
        },
        {
          baseFood: "Sel de table",
          substitute: "Mélange d'aromates",
          baseQuantity: "1 pincée de sel",
          substituteQuantity: "Mélange herbes + épices + jus de citron ou vinaigre",
          interest: "Diminution progressive du sel sans perte de plaisir",
          keywords: ["sel", "sel de table", "sale"],
        },
      ],
      "protéines": [
        {
          baseFood: "Charcuterie au quotidien",
          substitute: "Alternatives moins salées",
          baseQuantity: "2 tranches de saucisson ou chorizo",
          substituteQuantity: "2 tranches de jambon blanc découenné dégraissé",
          interest: "Moins de sel, moins de graisses saturées",
          keywords: ["charcuterie", "saucisson", "chorizo", "charcuterie grasse"],
        },
        {
          baseFood: "Charcuterie",
          substitute: "Poulet froid ou poisson en conserve sans sel ajouté",
          baseQuantity: "1 portion de charcuterie",
          substituteQuantity: "1 portion de poulet froid ou de poisson en conserve sans sel ajouté (ex: rillettes → thon nature + fromage frais + citron)",
          interest: "Moins de sel, alternatives plus saines",
          keywords: ["charcuterie", "rillettes", "charcuterie grasse"],
        },
      ],
      "matières-grasses": [
        {
          baseFood: "Fromages très salés",
          substitute: "Fromages plus doux",
          baseQuantity: "30 g feta",
          substituteQuantity: "30 g ricotta, mozzarella ou fromage frais",
          interest: "Souvent moins salés (ou possibilité de rincer la feta)",
          keywords: ["fromage", "feta", "fromage salé"],
        },
      ],
      "féculents": [],
      "boissons": [],
      "snacks": [],
      "desserts": [],
    },
  },

  "sleep-stress": {
    id: "sleep-stress",
    title: "Mieux dormir et gérer le stress",
    icon: "😴",
    keyPrinciples: [
      "Éviter les gros repas gras tardifs",
      "Limiter café, boissons énergisantes, thé fort en fin de journée",
      "Favoriser un dîner modéré, avec féculents + légumes + protéines",
    ],
    equivalences: {
      "général": [
        {
          baseFood: "Repas lourd le soir",
          substitute: "Repas plus léger mais complet",
          baseQuantity: "Pizza ou fast-food tardif",
          substituteQuantity: "Plat simple (exemple: pâtes complètes + légumes + œufs ou poisson)",
          interest: "Digestion plus facile, meilleur sommeil",
          context: "dîner",
          keywords: ["repas", "repas lourd", "pizza", "fast-food", "soir", "dîner"],
        },
      ],
      "boissons": [
        {
          baseFood: "Café après 16-17h",
          substitute: "Boisson chaude sans caféine",
          baseQuantity: "Café fort",
          substituteQuantity: "Tisane, rooibos, infusion",
          interest: "Moins de stimulation, meilleure qualité de sommeil",
          context: "après-midi",
          keywords: ["café", "café fort", "caféine", "boisson énergisante"],
        },
      ],
      "snacks": [
        {
          baseFood: "Grignotage sucré tardif",
          substitute: "Collation légère si besoin",
          baseQuantity: "Biscuits, chocolat en grande quantité",
          substituteQuantity: "Yaourt nature + 1 fruit ou petite poignée d'oléagineux",
          interest: "Limite les variations de glycémie nocturnes",
          context: "soir",
          keywords: ["grignotage", "biscuits", "chocolat", "soir", "tardif"],
        },
      ],
      "féculents": [],
      "protéines": [],
      "matières-grasses": [],
      "desserts": [],
    },
  },
};

/**
 * Recherche d'équivalences nutritionnelles par objectif et catégorie
 */
export function searchNutritionEquivalences(
  goal: NutritionGoal,
  query?: string
): Record<EquivalenceCategory, NutritionEquivalence[]> {
  const goalData = NUTRITION_GOALS[goal];
  
  if (!query || query.trim().length === 0) {
    return goalData.equivalences;
  }

  const normalizedQuery = query.toLowerCase().trim();
  const filtered: Record<EquivalenceCategory, NutritionEquivalence[]> = {
    "féculents": [],
    "protéines": [],
    "matières-grasses": [],
    "boissons": [],
    "snacks": [],
    "desserts": [],
    "général": [],
  };

  Object.entries(goalData.equivalences).forEach(([category, equivalences]) => {
    filtered[category as EquivalenceCategory] = equivalences.filter((eq) => {
      return (
        eq.baseFood.toLowerCase().includes(normalizedQuery) ||
        eq.substitute.toLowerCase().includes(normalizedQuery) ||
        eq.keywords.some((kw) => kw.toLowerCase().includes(normalizedQuery))
      );
    });
  });

  return filtered;
}

/**
 * Obtient les catégories avec des équivalences pour un objectif
 */
export function getCategoriesWithEquivalences(goal: NutritionGoal): EquivalenceCategory[] {
  const goalData = NUTRITION_GOALS[goal];
  return Object.entries(goalData.equivalences)
    .filter(([_, equivalences]) => equivalences.length > 0)
    .map(([category]) => category as EquivalenceCategory);
}

