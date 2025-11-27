// Base de données des équivalences alimentaires

export type Equivalence = {
  ingredient: string;
  category: string;
  alternatives: Alternative[];
  keywords: string[]; // Mots-clés pour la recherche
  type: "recipe" | "nutrition"; // Type d'équivalence
};

export type Alternative = {
  name: string;
  equivalence: string;
  interest?: string;
  idealFor?: string;
  remarks?: string;
  limits?: string;
  variant?: string; // Pour les variantes
};

export const EQUIVALENCES: Equivalence[] = [
  // ========== ÉQUIVALENCES POUR RECETTES ==========
  // 1. MATIÈRES GRASSES - BEURRE
  {
    ingredient: "beurre",
    category: "Matières grasses - Pâtisserie",
    type: "recipe",
    keywords: ["beurre", "beurres"],
    alternatives: [
      {
        name: "Huile végétale neutre",
        equivalence: "100 g de beurre ≈ 80 g d'huile (colza, tournesol, pépin de raisin)",
        interest: "Moins de graisses saturées, plus d'acides gras insaturés (AGPI et AGMI)",
        remarks: "Texture un peu plus fondante. Ne pas dépasser 100 à 120 ml d'huile pour un gâteau classique",
      },
      {
        name: "Mélange huile + compote de fruit",
        equivalence: "100 g de beurre → 40 g d'huile + 60 g de compote sans sucres ajoutés",
        interest: "Moins de graisses totales, plus de fibres si compote avec morceaux, moins de calories pour la même sensation de moelleux",
        idealFor: "Cakes, muffins, gâteaux moelleux",
      },
      {
        name: "Yaourt ou fromage blanc",
        equivalence: "100 g de beurre → 80 à 100 g de yaourt nature ou fromage blanc à 3-4% de MG",
        interest: "Réduction importante des graisses saturées, apport de protéines et de calcium",
        limits: "À éviter dans les pâtes sablées et feuilletées. Gâteaux plus moelleux mais moins fondants",
      },
      {
        name: "Purée d'oléagineux (amande, noisette, cacahuète)",
        equivalence: "100 g de beurre → 80 à 100 g de purée d'amande ou de noisette",
        interest: "Plus d'acides gras insaturés, plus de fibres et de minéraux",
        remarks: "Apporte un goût plus marqué. Intéressant pour biscuits, cookies, cakes",
      },
    ],
  },
  {
    ingredient: "beurre",
    category: "Matières grasses - Tartines",
    type: "recipe",
    keywords: ["beurre", "beurres", "tartine"],
    alternatives: [
      {
        name: "Purée d'oléagineux",
        equivalence: "10 g de beurre → 10 g de purée d'amande, noisette ou cacahuète",
        interest: "Plus de \"bons gras\" et de protéines",
      },
      {
        name: "Avocat écrasé",
        equivalence: "10 g de beurre → 20 g d'avocat",
        interest: "Plus de fibres et d'AGMI",
      },
      {
        name: "Fromage frais (ricotta ou carré frais)",
        equivalence: "10 g de beurre → 15 g de fromage frais",
        interest: "Plus de protéines, moins de graisses saturées",
      },
    ],
  },

  // 2. ŒUFS
  {
    ingredient: "œuf",
    category: "Pâtisserie",
    type: "recipe",
    keywords: ["œuf", "oeuf", "œufs", "oeufs", "oeuf", "œuf"],
    alternatives: [
      {
        name: "Compote de pomme",
        equivalence: "1 œuf → 50 g de compote sans sucres ajoutés",
        interest: "Moelleux, moins de graisses",
        limits: "À éviter dans les recettes où l'œuf donne du volume (génoises légères)",
      },
      {
        name: "Banane écrasée",
        equivalence: "1 œuf → 50 à 60 g de banane bien mûre écrasée",
        interest: "Sucre naturel, potassium, fibres",
        remarks: "Goût banane prononcé",
      },
      {
        name: "Graines de chia ou de lin (œuf de chia/lin)",
        equivalence: "1 œuf → 1 c. à soupe rase de graines de chia ou lin moulues + 3 c. à soupe d'eau (laisser gonfler 10 minutes)",
        interest: "Plus de fibres, AGPI oméga 3",
        idealFor: "Muffins, gâteaux denses, pains maison",
      },
      {
        name: "Yaourt ou boisson végétale",
        equivalence: "1 œuf → 40 g de yaourt ou 40 ml de boisson végétale + 1 c. à café d'huile",
        interest: "Texture moelleuse, moins riche en cholestérol",
        idealFor: "Cakes rapides",
      },
      {
        name: "Tofu soyeux (vegan, riche en protéines)",
        equivalence: "1 œuf → 40 à 50 g de tofu soyeux mixé",
        interest: "Riche en protéines, texture fondante",
        idealFor: "Flans, cheesecakes légers, crèmes dessert",
      },
    ],
  },

  // 3. SUCRE
  {
    ingredient: "sucre",
    category: "Édulcorants",
    type: "recipe",
    keywords: ["sucre", "sucres", "sucre blanc"],
    alternatives: [
      {
        name: "Réduction directe",
        equivalence: "100 g de sucre dans une recette standard → essayer 70 à 80 g",
        interest: "Moins de sucres ajoutés, goût déjà suffisant dans la majorité des gâteaux",
        remarks: "Ajouter des épices ou zestes pour compenser la baisse de sucre",
      },
      {
        name: "Sucre complet ou non raffiné",
        equivalence: "100 g sucre blanc → 80 à 100 g de sucre complet, muscovado, rapadura, sucre de coco",
        interest: "Légèrement plus de minéraux, arômes plus riches",
        remarks: "Impact glycémique global similaire",
      },
      {
        name: "Miel ou sirop d'érable",
        equivalence: "100 g de sucre → 70 à 75 g de miel ou sirop d'érable (diminuer légèrement le liquide de 10 à 15 ml)",
        interest: "Goût plus intense, possibilité de mettre un peu moins",
        remarks: "Reste une source de sucres rapides",
      },
      {
        name: "Purée de dattes ou de fruits secs",
        equivalence: "100 g de sucre → 80 à 100 g de dattes dénoyautées mixées avec un peu d'eau",
        interest: "Fibres, minéraux",
        idealFor: "Barres, bouchées énergétiques, pâte à tartiner",
      },
      {
        name: "Mélange sucre + compote ou banane",
        equivalence: "100 g de sucre → 40 g de sucre + 60 g de compote ou banane écrasée",
        interest: "Réduction nette des sucres ajoutés, plus de fibres et de volume",
      },
    ],
  },

  // 4. FARINE BLANCHE
  {
    ingredient: "farine",
    category: "Farines",
    type: "recipe",
    keywords: ["farine", "farines", "farine blanche", "farine de blé"],
    alternatives: [
      {
        name: "Farine semi-complète",
        equivalence: "100 g de farine blanche → 100 g de farine T80",
        interest: "Plus de fibres, meilleure satiété",
        remarks: "Généralement pas besoin d'adapter la recette",
      },
      {
        name: "Farine complète",
        equivalence: "100 g → 90 à 100 g de farine T110 à T150 (parfois ajouter 1 à 2 c. à soupe de liquide)",
        interest: "Fibres multipliées, micronutriments plus élevés",
        remarks: "Texture plus dense",
      },
      {
        name: "Farine d'avoine",
        equivalence: "100 g de farine → 100 à 110 g de flocons d'avoine mixés",
        interest: "Fibres solubles, effet sur la satiété",
        idealFor: "Pancakes, cookies, muffins",
      },
      {
        name: "Remplacement partiel par poudre d'oléagineux",
        equivalence: "100 g de farine → 70 g de farine + 30 g de poudre d'amande ou noisette",
        interest: "Plus de bonnes graisses, index glycémique un peu plus bas",
        remarks: "Texture plus fondante",
      },
    ],
  },

  // 5. LAIT ET CRÈME
  {
    ingredient: "lait",
    category: "Produits laitiers",
    type: "recipe",
    keywords: ["lait", "lait entier"],
    alternatives: [
      {
        name: "Lait demi-écrémé",
        equivalence: "100 ml → 100 ml",
        interest: "Moins de graisses saturées",
      },
      {
        name: "Boisson végétale",
        equivalence: "100 ml → 100 ml de boisson soja, avoine ou amande",
        interest: "Pour intolérants ou choix éthique. Boisson soja enrichie en calcium = bonne alternative",
      },
    ],
  },
  {
    ingredient: "crème",
    category: "Produits laitiers",
    type: "recipe",
    keywords: ["crème", "crème fraîche", "crème entière"],
    alternatives: [
      {
        name: "Crème légère",
        equivalence: "100 ml de crème entière → 100 ml de crème à 15% de MG",
      },
      {
        name: "Yaourt grec ou fromage blanc",
        equivalence: "100 ml de crème → 100 g de yaourt grec 5% ou fromage blanc",
        interest: "Moins de graisses saturées, plus de protéines",
        remarks: "À ajouter plutôt en fin de cuisson pour sauces et quiches",
      },
      {
        name: "Crème végétale",
        equivalence: "100 ml de crème → 100 ml de crème soja ou avoine cuisine",
        interest: "Moins riche en graisses saturées selon la crème choisie",
      },
    ],
  },

  // 6. VIANDES ET PROTÉINES
  {
    ingredient: "viande hachée",
    category: "Protéines",
    type: "recipe",
    keywords: ["viande", "viande hachée", "bœuf", "steak haché"],
    alternatives: [
      {
        name: "Lentilles cuites",
        equivalence: "100 g de viande → 120 à 150 g de lentilles cuites",
        interest: "Fibres, protéines végétales",
        idealFor: "Bolognaise, chili, hachis parmentier",
      },
      {
        name: "Tofu ferme émietté",
        equivalence: "100 g de viande → 100 g de tofu ferme émietté mariné",
        interest: "Protéines végétales riches en AGPI",
        remarks: "À bien assaisonner",
      },
      {
        name: "PST (protéine de soja texturée)",
        equivalence: "100 g de viande → 40 g de PST sèches réhydratées dans bouillon",
        interest: "Beaucoup de protéines, peu de graisses",
      },
    ],
  },
  {
    ingredient: "panure",
    category: "Panures",
    type: "recipe",
    keywords: ["panure", "chapelure", "pané"],
    alternatives: [
      {
        name: "Flocons d'avoine ou polenta",
        equivalence: "Même quantité qu'une chapelure",
        interest: "Plus de fibres que panure blanche",
      },
    ],
  },
  {
    ingredient: "steak haché",
    category: "Protéines",
    type: "recipe",
    keywords: ["steak", "steak haché", "burger", "nugget"],
    alternatives: [
      {
        name: "Galette de pois chiches (falafel burger)",
        equivalence: "100 g de steak haché → 100 g de galette de pois chiches cuits mixés",
      },
    ],
  },

  // 7. SEL ET BOUILLON
  {
    ingredient: "sel",
    category: "Assaisonnements",
    type: "recipe",
    keywords: ["sel", "sale"],
    alternatives: [
      {
        name: "Herbes, épices et agrumes",
        equivalence: "Remplacer une partie du sel par herbes aromatiques, ail, oignon, citron, zeste, vinaigre",
        interest: "Réduction sodium",
      },
    ],
  },
  {
    ingredient: "bouillon cube",
    category: "Assaisonnements",
    type: "recipe",
    keywords: ["bouillon", "bouillon cube", "cube"],
    alternatives: [
      {
        name: "Bouillon maison ou cube réduit en sel",
        equivalence: "1 cube standard → 1 cube \"réduit en sel\" + herbes + épices",
      },
    ],
  },

  // 8. LIANTS ET ÉPAISSISSANTS
  {
    ingredient: "roux",
    category: "Liants",
    type: "recipe",
    keywords: ["roux", "beurre farine"],
    alternatives: [
      {
        name: "Fécule ou maïzena",
        equivalence: "20 g de beurre + 20 g de farine pour 250 ml de lait → 10 g de fécule pour 250 ml de liquide",
        interest: "Moins de matières grasses",
      },
    ],
  },
  {
    ingredient: "crème épaississante",
    category: "Liants",
    type: "recipe",
    keywords: ["crème", "épaissir"],
    alternatives: [
      {
        name: "Yaourt grec ou fromage blanc",
        equivalence: "2 c. à soupe de crème → 2 c. à soupe de yaourt grec ajouté en fin de cuisson",
      },
    ],
  },

  // 1.1 CRÈME FRAÎCHE ÉPAISSE - NOUVELLES ALTERNATIVES
  {
    ingredient: "crème fraîche épaisse",
    category: "Produits laitiers",
    type: "recipe",
    keywords: ["crème fraîche épaisse", "crème fraîche entière", "crème épaisse"],
    alternatives: [
      {
        name: "Skyr nature",
        equivalence: "100 g de crème fraîche entière → 80 à 100 g de skyr nature",
        interest: "Beaucoup plus riche en protéines, beaucoup moins de graisses saturées",
        idealFor: "Sauces froides, dips, garnitures de wraps, quiches \"plus légères\"",
      },
      {
        name: "Fromage frais type ricotta",
        equivalence: "100 g de crème → 100 g de ricotta",
        interest: "Moins grasse, plus riche en protéines et calcium",
        idealFor: "Gratins, lasagnes, farces de légumes",
      },
      {
        name: "Lait concentré non sucré",
        equivalence: "100 ml de crème → 80 à 100 ml de lait concentré non sucré + 1 c. à café d'huile neutre",
        interest: "Apporte du crémeux avec moins de graisses",
        idealFor: "Sauces chaudes, gratins, quiches",
      },
      {
        name: "Crème de soja ou avoine cuisine enrichie en calcium",
        equivalence: "100 ml de crème → 100 ml de crème végétale",
        interest: "Souvent moins de graisses saturées, compatible alimentation végétarienne ou intolérance au lactose",
      },
    ],
  },

  // 1.2 GRAISSE DE CUISSON
  {
    ingredient: "beurre de cuisson",
    category: "Matières grasses - Cuisson",
    type: "recipe",
    keywords: ["beurre de cuisson", "beurre cuisson", "cuisson beurre"],
    alternatives: [
      {
        name: "Huile d'olive",
        equivalence: "10 g de beurre → 7 à 8 g d'huile d'olive",
        interest: "Plus d'acides gras mono-insaturés",
        idealFor: "Poêlées, légumes, viandes blanches",
      },
    ],
  },
  {
    ingredient: "cuisson frite",
    category: "Méthodes de cuisson",
    type: "recipe",
    keywords: ["frit", "frite", "friture", "nuggets frits", "friture"],
    alternatives: [
      {
        name: "Cuisson au four avec un peu d'huile",
        equivalence: "Nuggets maison frits → nuggets au four avec 1 à 2 c. à soupe d'huile pour toute la plaque",
        interest: "Beaucoup moins de graisses totales",
        idealFor: "Pommes de terre rôties, légumes rôtis, falafels, galettes",
      },
    ],
  },

  // 2.1 AUTRES SUBSTITUTS D'ŒUFS - LIANT
  {
    ingredient: "œuf liant",
    category: "Liants - Œufs",
    type: "recipe",
    keywords: ["œuf liant", "oeuf liant", "œuf pour lier", "oeuf pour lier"],
    alternatives: [
      {
        name: "Fécule + eau",
        equivalence: "1 œuf → 1 c. à soupe bombée de fécule de maïs ou de pomme de terre + 2 c. à soupe d'eau",
        interest: "Épaissit et lie sans ajouter de graisses ni cholestérol",
        idealFor: "Gâteaux, crêpes, galettes",
      },
      {
        name: "Aquafaba (pour blanc d'œuf en neige)",
        equivalence: "1 blanc d'œuf → 30 ml d'aquafaba (jus de cuisson ou jus de conserve de pois chiches) monté en neige",
        interest: "100% végétal, très peu calorique",
        idealFor: "Mousses \"végétales\", meringues véganes",
      },
      {
        name: "Mélange lait + fécule (pour quiche)",
        equivalence: "1 œuf → 40 ml de lait ou boisson végétale + 1 c. à café de fécule",
        interest: "Diminue les lipides et le cholestérol",
        remarks: "À compléter avec fromage frais ou skyr pour garder une bonne tenue",
      },
      {
        name: "Pomme de terre ou patate douce écrasée (pour boulettes/galettes)",
        equivalence: "1 œuf → 40 à 50 g de purée de pomme de terre ou patate douce",
        interest: "Donne du liant, ajoute un féculent rassasiant",
        idealFor: "Boulettes de légumes, galettes de légumineuses",
      },
    ],
  },

  // 3.1 ALTERNATIVES SUPPLÉMENTAIRES AU SUCRE
  {
    ingredient: "yaourt aromatisé",
    category: "Produits sucrés",
    type: "recipe",
    keywords: ["yaourt aromatisé", "yaourt sucré", "yaourt parfumé"],
    alternatives: [
      {
        name: "Yaourt nature + toppings",
        equivalence: "1 yaourt aromatisé (sucré) → 1 yaourt nature + 1 c. à café de miel ou sirop + 1 petite poignée de fruits frais",
        interest: "Moins de sucres ajoutés, plus de fibres et de micronutriments via les fruits",
      },
    ],
  },
  {
    ingredient: "crème dessert",
    category: "Desserts",
    type: "recipe",
    keywords: ["crème dessert", "crème dessert industrielle", "dessert chocolat"],
    alternatives: [
      {
        name: "Fromage blanc ou skyr + cacao",
        equivalence: "1 crème dessert chocolat → 150 g de fromage blanc ou skyr + 1 c. à café de cacao non sucré + 1 c. à café de sucre ou miel",
        interest: "Plus de protéines, moins de graisses, moins de sucres selon la dose ajoutée",
      },
    ],
  },
  {
    ingredient: "sucre épices",
    category: "Édulcorants",
    type: "recipe",
    keywords: ["sucre", "réduire sucre", "moins sucre"],
    alternatives: [
      {
        name: "Épices et arômes",
        equivalence: "Diminuer le sucre de 20 à 30% et ajouter vanille, cannelle, fève tonka en petite quantité, zestes d'agrumes",
        interest: "Réduction des sucres ajoutés sans perte de plaisir",
      },
    ],
  },
  {
    ingredient: "confiture",
    category: "Produits sucrés",
    type: "recipe",
    keywords: ["confiture", "confiture classique"],
    alternatives: [
      {
        name: "Compote avec morceaux + un peu de miel",
        equivalence: "1 c. à soupe de confiture → 2 c. à soupe de compote + 1 c. à café de miel",
        interest: "Plus de fruits, moins de sucre concentré",
      },
    ],
  },
  {
    ingredient: "bonbons",
    category: "Snacks sucrés",
    type: "recipe",
    keywords: ["bonbons", "bonbon", "sucreries"],
    alternatives: [
      {
        name: "Fruits secs en petite quantité",
        equivalence: "30 g de bonbons → 15 g de fruits secs (raisins secs, abricots, dattes) + 1 ou 2 noix ou amandes",
        interest: "Fibres, micronutriments",
        remarks: "Reste sucré mais plus rassasiant",
      },
    ],
  },

  // 4.1 FARINES SUPPLÉMENTAIRES
  {
    ingredient: "farine pois chiches",
    category: "Farines - Légumineuses",
    type: "recipe",
    keywords: ["farine pois chiches", "farine de pois chiches"],
    alternatives: [
      {
        name: "Remplacement partiel",
        equivalence: "100 g de farine blanche → 60 à 70 g de farine blanche + 30 à 40 g de farine de pois chiches",
        interest: "Plus de protéines, plus de fibres",
        idealFor: "Crêpes salées, galettes, pâtes à tarte salées",
      },
    ],
  },
  {
    ingredient: "farine sarrasin",
    category: "Farines - Sans gluten",
    type: "recipe",
    keywords: ["farine sarrasin", "farine de sarrasin", "sarrasin"],
    alternatives: [
      {
        name: "Remplacement partiel ou total",
        equivalence: "100 g de farine de blé → 50 à 70 g de farine de sarrasin + 30 à 50 g de farine de blé",
        interest: "Sans gluten si 100% sarrasin, apport intéressant en fibres",
        idealFor: "Crêpes, pâtes à tarte rustiques",
      },
    ],
  },
  {
    ingredient: "farine riz",
    category: "Farines - Sans gluten",
    type: "recipe",
    keywords: ["farine riz", "farine de riz"],
    alternatives: [
      {
        name: "Farine de riz + fécule",
        equivalence: "100 g de farine de blé → 80 g de farine de riz + 20 g de fécule",
        interest: "Option sans gluten",
        remarks: "Texture plus friable, à réserver plutôt aux gâteaux moelleux",
      },
    ],
  },
  {
    ingredient: "farine coco",
    category: "Farines - Alternatives",
    type: "recipe",
    keywords: ["farine coco", "farine de coco"],
    alternatives: [
      {
        name: "Remplacement partiel seulement",
        equivalence: "Sur 100 g de farine → 80 g de farine de blé + 20 g de farine de coco",
        interest: "Très riche en fibres",
        remarks: "Absorbe beaucoup de liquide → souvent ajouter un peu de lait ou œuf en plus",
      },
    ],
  },

  // 5. FROMAGES ET GARNITURES
  {
    ingredient: "cream cheese",
    category: "Fromages",
    type: "recipe",
    keywords: ["cream cheese", "philadelphia", "fromage à tartiner"],
    alternatives: [
      {
        name: "Skyr ou fromage frais battu",
        equivalence: "100 g de cream cheese → 80 à 100 g de skyr battu avec 10 g de purée d'amande ou un peu d'huile neutre",
        interest: "Moins de graisses saturées, plus de protéines",
        idealFor: "Cheesecakes \"allégés\", tartinades",
      },
    ],
  },
  {
    ingredient: "fromage râpé",
    category: "Fromages",
    type: "recipe",
    keywords: ["fromage râpé", "fromage gratin", "gratin fromage"],
    alternatives: [
      {
        name: "Mélange fromage + chapelure",
        equivalence: "50 g de fromage râpé → 25 g de fromage râpé + 10 à 15 g de chapelure ou flocons d'avoine",
        interest: "Moins de graisses saturées, visuel gratiné préservé",
      },
    ],
  },
  {
    ingredient: "charcuterie apéro",
    category: "Charcuteries",
    type: "recipe",
    keywords: ["charcuterie", "rillettes", "saucisson", "apéro"],
    alternatives: [
      {
        name: "Tartinades à base de légumineuses",
        equivalence: "30 g de rillettes → 40 à 50 g d'houmous, caviar de lentilles, purée de pois cassés",
        interest: "Moins de graisses saturées, plus de fibres et protéines végétales",
      },
    ],
  },

  // 6. VIANDES, CHARCUTERIES ET PRODUITS ANIMAUX
  {
    ingredient: "charcuterie grasse",
    category: "Charcuteries",
    type: "recipe",
    keywords: ["charcuterie grasse", "saucisson", "charcuterie"],
    alternatives: [
      {
        name: "Jambon découenné dégraissé",
        equivalence: "40 g de saucisson → 40 g de jambon blanc découenné",
        interest: "Beaucoup moins de graisses saturées et de calories",
        remarks: "Vigilance toujours sur le sel",
      },
    ],
  },
  {
    ingredient: "lardons",
    category: "Charcuteries",
    type: "recipe",
    keywords: ["lardons", "lardon", "bacon"],
    alternatives: [
      {
        name: "Allumettes de jambon ou tofu fumé",
        equivalence: "50 g de lardons → 50 g de tofu fumé en dés ou 40 g d'allumettes de jambon",
        interest: "Moins de graisses saturées. Version tofu = protéines végétales",
      },
    ],
  },
  {
    ingredient: "steak haché 20%",
    category: "Viandes",
    type: "recipe",
    keywords: ["steak haché", "steak 20%", "viande hachée grasse"],
    alternatives: [
      {
        name: "Steak 5% ou pavé de volaille",
        equivalence: "100 g de steak 20% → 100 g de steak 5% ou 120 g de filet de poulet",
        interest: "Moins de lipides saturés, apport protéique conservé",
      },
    ],
  },
  {
    ingredient: "panure frite",
    category: "Panures",
    type: "recipe",
    keywords: ["panure frite", "escalope panée frite", "pané frit"],
    alternatives: [
      {
        name: "Panure aux flocons d'avoine + cuisson au four",
        equivalence: "1 escalope panée frite → 1 escalope panée aux flocons d'avoine ou chapelure + cuisson au four",
        interest: "Moins de graisses, plus de fibres",
      },
    ],
  },

  // 7. AUTRES LIANTS ET TRUCS MAGIQUES
  {
    ingredient: "psyllium",
    category: "Liants",
    type: "recipe",
    keywords: ["psyllium", "psyllium blond"],
    alternatives: [
      {
        name: "Psyllium blond",
        equivalence: "1 c. à café de psyllium + 3 à 4 c. à soupe d'eau",
        interest: "Très riche en fibres solubles",
        idealFor: "Donner du moelleux aux pains sans gluten, lier des galettes de légumes",
      },
    ],
  },
  {
    ingredient: "gélatine",
    category: "Liants",
    type: "recipe",
    keywords: ["gélatine", "gélatine animale", "feuille gélatine"],
    alternatives: [
      {
        name: "Agar agar",
        equivalence: "1 feuille de gélatine (2 g) → environ 1 g d'agar agar",
        interest: "100% végétal, sans graisses ni sucres",
        remarks: "À faire bouillir dans le liquide au moins 30 secondes",
      },
    ],
  },
  {
    ingredient: "flocons céréales",
    category: "Farines - Flocons",
    type: "recipe",
    keywords: ["flocons", "flocons avoine", "flocons sarrasin", "flocons épeautre"],
    alternatives: [
      {
        name: "Flocons de céréales",
        equivalence: "Remplacer une partie de la panure ou de la farine par des flocons d'avoine, sarrasin ou épeautre",
        interest: "Fibres, texture intéressante",
      },
    ],
  },

  // 8. SNACKS & ACCOMPAGNEMENTS
  {
    ingredient: "chips",
    category: "Snacks",
    type: "recipe",
    keywords: ["chips", "chips classiques", "chips pommes de terre"],
    alternatives: [
      {
        name: "Pois chiches rôtis",
        equivalence: "30 g de chips → 30 g de pois chiches rôtis au four avec épices",
        interest: "Plus de protéines et de fibres, moins de graisses saturées",
      },
    ],
  },
  {
    ingredient: "croûtons",
    category: "Accompagnements",
    type: "recipe",
    keywords: ["croûtons", "croûtons gras", "croûtons soupe"],
    alternatives: [
      {
        name: "Pain complet grillé frotté à l'ail",
        equivalence: "20 g de croûtons → 20 g de pain complet grillé en dés",
        interest: "Plus de fibres, graisses maîtrisées selon la quantité d'huile",
      },
    ],
  },
  {
    ingredient: "biscuits apéritifs",
    category: "Snacks",
    type: "recipe",
    keywords: ["biscuits apéritifs", "biscuits apéro", "apéritif"],
    alternatives: [
      {
        name: "Mélange fruits secs et oléagineux",
        equivalence: "30 g de biscuits apéritifs → 20 g de mélange noix amandes + 10 g de fruits secs",
        interest: "Meilleure qualité de graisses, plus rassasiant",
      },
    ],
  },

  // ========== CONSEILS NUTRITIONNELS POUR L'ALIMENTATION QUOTIDIENNE ==========
  
  // 1.1 CÉRÉALES DU PETIT DÉJEUNER
  {
    ingredient: "céréales chocolatées",
    category: "Petits déjeuners",
    type: "nutrition",
    keywords: ["céréales chocolatées", "céréales sucrées", "céréales petit déjeuner", "céréales industrielles"],
    alternatives: [
      {
        name: "Muesli maison",
        equivalence: "40 g de céréales sucrées → 40 g de flocons d'avoine + 5 g de noix ou amandes + 5 g de raisins secs",
        interest: "Plus de fibres, meilleure satiété, moins de sucres ajoutés",
        remarks: "Tu peux \"caraméliser\" légèrement au four avec un peu de miel pour rester gourmand",
      },
    ],
  },
  {
    ingredient: "granola industriel",
    category: "Petits déjeuners",
    type: "nutrition",
    keywords: ["granola", "granola industriel", "granola sucré"],
    alternatives: [
      {
        name: "Granola maison \"light\"",
        equivalence: "50 g granola du commerce → 40 g granola maison avec flocons d'avoine, oléagineux, 1 à 2 c. à café de miel pour 40 g",
        interest: "Contrôle des sucres et des graisses ajoutées",
      },
    ],
  },

  // 1.2 VIENNOISERIES ET TARTINES
  {
    ingredient: "croissant",
    category: "Petits déjeuners",
    type: "nutrition",
    keywords: ["croissant", "pain au chocolat", "viennoiserie"],
    alternatives: [
      {
        name: "Pain complet + purée d'oléagineux + fruit",
        equivalence: "1 croissant ≈ 200 à 250 kcal → 1 tranche de pain complet + 10 g de purée d'amande + 1 fruit",
        interest: "Moins de graisses saturées, plus de fibres et de protéines",
      },
    ],
  },
  {
    ingredient: "brioche",
    category: "Petits déjeuners",
    type: "nutrition",
    keywords: ["brioche", "brioche au beurre"],
    alternatives: [
      {
        name: "Pain aux graines + fromage frais / ricotta",
        equivalence: "60 g de brioche → 40 à 50 g de pain aux graines + 15 g de fromage frais",
        interest: "Plus rassasiant, meilleur profil lipidique",
      },
    ],
  },

  // 2.1 SODAS ET BOISSONS SUCRÉES
  {
    ingredient: "soda",
    category: "Boissons",
    type: "nutrition",
    keywords: ["soda", "soda classique", "boisson sucrée", "sodas"],
    alternatives: [
      {
        name: "Eau gazeuse + jus de citron + sirop",
        equivalence: "250 ml soda → 250 ml d'eau gazeuse + 1 c. à café de sirop ou de jus de citron + quelques glaçons",
        interest: "Réduction majeure du sucre",
        variant: "Eau + rondelles de citron, orange, menthe ou fruits rouges congelés",
      },
    ],
  },
  {
    ingredient: "jus de fruits",
    category: "Boissons",
    type: "nutrition",
    keywords: ["jus de fruits", "jus d'orange", "jus pur"],
    alternatives: [
      {
        name: "Fruit entier + verre d'eau",
        equivalence: "200 ml de jus d'orange → 1 orange entière + 1 verre d'eau",
        interest: "Plus de fibres, satiété supérieure",
      },
    ],
  },

  // 2.2 BOISSONS CHAUDES
  {
    ingredient: "café sucré",
    category: "Boissons",
    type: "nutrition",
    keywords: ["café", "café sucré", "café avec sucre"],
    alternatives: [
      {
        name: "Café avec 1 sucre + cannelle ou cacao non sucré",
        equivalence: "2 morceaux de sucre → 1 morceau + épices",
        interest: "Réduction progressive des sucres, utile pour diminution sans frustration",
      },
    ],
  },
  {
    ingredient: "chocolat chaud",
    category: "Boissons",
    type: "nutrition",
    keywords: ["chocolat chaud", "chocolat en poudre", "chocolat sucré"],
    alternatives: [
      {
        name: "Chocolat chaud cacao + lait",
        equivalence: "1 sachet de chocolat en poudre sucré → 1 c. à soupe de cacao non sucré + 1 à 2 c. à café de sucre ou miel",
        interest: "Moins de sucres ajoutés, dose contrôlée",
      },
    ],
  },

  // 3.1 RIZ
  {
    ingredient: "riz blanc",
    category: "Féculents",
    type: "nutrition",
    keywords: ["riz blanc", "riz standard", "riz"],
    alternatives: [
      {
        name: "Riz basmati complet ou semi-complet",
        equivalence: "60 g crus de riz blanc → 60 g crus de riz basmati complet",
        interest: "IG plus bas, plus de fibres",
      },
      {
        name: "Mélange riz + lentilles corail",
        equivalence: "60 g de riz blanc → 40 g de riz + 20 g de lentilles corail",
        interest: "Plus de protéines, plus de fibres",
        remarks: "Cuisson ensemble dans une grande quantité d'eau",
      },
    ],
  },

  // 3.2 PÂTES
  {
    ingredient: "pâtes blanches",
    category: "Féculents",
    type: "nutrition",
    keywords: ["pâtes", "pâtes blanches", "pâtes classiques"],
    alternatives: [
      {
        name: "Pâtes complètes ou aux légumineuses",
        equivalence: "70 g de pâtes blanches → 70 g de pâtes complètes ou de pâtes aux pois chiches ou lentilles",
        interest: "Plus de protéines végétales, plus de fibres",
      },
      {
        name: "Pâtes + sauce tomate maison + légumes",
        equivalence: "70 g pâtes + 100 ml sauce crème → 70 g pâtes + 150 g de sauce tomate aux légumes",
        interest: "Moins de graisses, plus de fibres et de volume rassasiant",
      },
    ],
  },

  // 3.3 PAIN
  {
    ingredient: "pain blanc",
    category: "Féculents",
    type: "nutrition",
    keywords: ["pain blanc", "baguette", "pain"],
    alternatives: [
      {
        name: "Pain complet ou pain aux graines",
        equivalence: "40 g de baguette → 40 g de pain complet ou aux graines",
        interest: "Plus de fibres, meilleur contrôle de la glycémie",
      },
    ],
  },

  // 4.1 PÂTE À TARTE
  {
    ingredient: "pâte brisée",
    category: "Bases de pâte",
    type: "nutrition",
    keywords: ["pâte brisée", "pâte à tarte", "pâte au beurre"],
    alternatives: [
      {
        name: "Pâte à tarte à l'huile",
        equivalence: "250 g farine 125 g beurre → 250 g farine 70 g huile d'olive ou colza + eau",
        interest: "Moins de graisses saturées, meilleur profil AG",
      },
    ],
  },
  {
    ingredient: "pâte feuilletée",
    category: "Bases de pâte",
    type: "nutrition",
    keywords: ["pâte feuilletée", "pâte feuilletée industrielle"],
    alternatives: [
      {
        name: "Base \"carrée\" de feuilles de brick",
        equivalence: "1 pâte feuilletée → 3 à 4 feuilles de brick légèrement huilées superposées",
        interest: "Moins de graisses, plus légère pour quiches et tartes fines",
      },
    ],
  },

  // 4.2 BASE DE PIZZA
  {
    ingredient: "pâte pizza",
    category: "Bases de pâte",
    type: "nutrition",
    keywords: ["pâte pizza", "pizza", "pâte pizza riche"],
    alternatives: [
      {
        name: "Pâte à pizza maison \"yaourt\"",
        equivalence: "250 g de farine 4 c. à soupe d'huile → 250 g farine + 200 g de yaourt nature + 1 c. à soupe d'huile + levure",
        interest: "Moins de graisses, un peu plus de protéines",
        remarks: "Très pratique pour pizzas rapides type \"patient pressé\"",
      },
    ],
  },

  // 5.1 MAYONNAISE ET SAUCES GRASSES
  {
    ingredient: "mayonnaise",
    category: "Sauces et condiments",
    type: "nutrition",
    keywords: ["mayonnaise", "mayo", "mayonnaise classique"],
    alternatives: [
      {
        name: "Sauce yaourt moutarde",
        equivalence: "1 c. à soupe de mayo ≈ 100 kcal → 1 c. à soupe de sauce yaourt nature + moutarde + citron ≈ 15 à 20 kcal",
        interest: "Réduction massive des graisses, peut être utilisée en grande quantité sans exploser les calories",
      },
    ],
  },
  {
    ingredient: "sauce cocktail",
    category: "Sauces et condiments",
    type: "nutrition",
    keywords: ["sauce cocktail", "sauce cocktail classique"],
    alternatives: [
      {
        name: "Sauce yaourt ketchup",
        equivalence: "1 portion sauce cocktail classique → 1 c. à soupe yaourt + 1 c. à café ketchup + paprika",
        interest: "Beaucoup moins de lipides",
      },
    ],
  },

  // 5.2 KETCHUP ET SAUCES SUCRÉES
  {
    ingredient: "ketchup",
    category: "Sauces et condiments",
    type: "nutrition",
    keywords: ["ketchup", "ketchup industriel"],
    alternatives: [
      {
        name: "Coulis de tomate réduit + épices",
        equivalence: "1 c. à soupe ketchup → 1 c. à soupe coulis de tomate réduit avec un peu de vinaigre et épices",
        interest: "Moins de sucre, plus de tomate \"vraie\"",
      },
    ],
  },
  {
    ingredient: "sauce teriyaki",
    category: "Sauces et condiments",
    type: "nutrition",
    keywords: ["sauce teriyaki", "sauce sucrée", "teriyaki"],
    alternatives: [
      {
        name: "Sauce soja réduite en sel + miel + jus d'orange",
        equivalence: "2 c. à soupe sauce soja + 1 c. à café de miel + 2 c. à soupe jus d'orange",
        interest: "Tu contrôles la quantité de sucre, profil plus intéressant si utilisé avec beaucoup de légumes",
      },
    ],
  },

  // 6.1 GLACES
  {
    ingredient: "glace",
    category: "Desserts",
    type: "nutrition",
    keywords: ["glace", "crème glacée", "glace riche"],
    alternatives: [
      {
        name: "Banane glacée \"nice cream\"",
        equivalence: "100 g de glace → 100 g de banane congelée mixée avec un peu de lait ou boisson végétale",
        interest: "Sans graisses ajoutées, sucre uniquement du fruit",
        variant: "Ajout de cacao, beurre d'oléagineux, framboises surgelées",
      },
      {
        name: "Skyr ou yaourt nature glacé",
        equivalence: "100 g de glace → 100 g de skyr + 1 c. à café de miel + fruits rouges congelés mixés",
        interest: "Plus de protéines, moins de graisses",
      },
    ],
  },

  // 7.1 RÉDUIRE CHARCUTERIE ET VIANDES GRASSES
  {
    ingredient: "saucisses",
    category: "Protéines",
    type: "nutrition",
    keywords: ["saucisses", "chipolatas", "saucisse"],
    alternatives: [
      {
        name: "Saucisses de volaille ou boulettes maison",
        equivalence: "1 chipolata → 1 saucisse de volaille ou 3 à 4 boulettes maison à base de volaille et légumes",
        interest: "Moins de graisses saturées, moins de sel si fait maison",
      },
    ],
  },
  {
    ingredient: "bacon",
    category: "Protéines",
    type: "nutrition",
    keywords: ["bacon", "bacon classique"],
    alternatives: [
      {
        name: "Bacon de dinde ou jambon grillé",
        equivalence: "2 tranches de bacon → 2 tranches de jambon blanc poêlées rapidement",
        interest: "Moins gras, similaire en utilisation pour sandwichs ou brunch",
      },
    ],
  },

  // 7.2 PROTÉINES VÉGÉTALES
  {
    ingredient: "poulet curry",
    category: "Protéines",
    type: "nutrition",
    keywords: ["poulet", "poulet curry", "curry poulet"],
    alternatives: [
      {
        name: "Pois chiches ou haricots blancs",
        equivalence: "100 g de poulet → 120 à 150 g de pois chiches cuits",
        interest: "Protéines végétales, fibres",
        remarks: "À combiner avec légumes, lait de coco allégé ou yaourt",
      },
    ],
  },
  {
    ingredient: "steak haché",
    category: "Protéines",
    type: "nutrition",
    keywords: ["steak haché", "steak", "burger"],
    alternatives: [
      {
        name: "Galette de haricots rouges ou noirs",
        equivalence: "1 steak haché → 1 galette faite avec 80 à 100 g de haricots rouges cuits + flocons d'avoine + épices",
        interest: "Riche en fibres, moins gras",
      },
    ],
  },

  // 8. AUTRES ASTRUCES ÉQUIVALENCES
  {
    ingredient: "frites",
    category: "Accompagnements",
    type: "nutrition",
    keywords: ["frites", "frite", "pommes frites"],
    alternatives: [
      {
        name: "Potatoes au four + crudités",
        equivalence: "150 g de frites → 150 g de pommes de terre au four avec peu d'huile + 100 g de crudités",
        interest: "Moins de graisses, plus de volume dans l'assiette",
      },
    ],
  },
  {
    ingredient: "fromage portion",
    category: "Fromages",
    type: "nutrition",
    keywords: ["fromage", "portion fromage", "fromage généreux"],
    alternatives: [
      {
        name: "Moitié fromage moitié crudités ou fruits",
        equivalence: "40 g de fromage → 20 g de fromage + crudités ou 1 petit fruit",
        interest: "Satisfait l'envie de fromage, limite les graisses saturées",
      },
    ],
  },
];

/**
 * Recherche d'équivalences pour un ingrédient
 */
export function searchEquivalences(query: string, type?: "recipe" | "nutrition"): Equivalence[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();

  return EQUIVALENCES.filter((equiv) => {
    // Filtrer par type si spécifié
    if (type && equiv.type !== type) {
      return false;
    }

    // Recherche dans le nom de l'ingrédient
    if (equiv.ingredient.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Recherche dans les mots-clés
    return equiv.keywords.some((keyword) =>
      keyword.toLowerCase().includes(normalizedQuery)
    );
  });
}

/**
 * Obtient toutes les équivalences pour un ingrédient spécifique
 */
export function getEquivalencesForIngredient(ingredient: string, type?: "recipe" | "nutrition"): Equivalence[] {
  const normalized = ingredient.toLowerCase().trim();
  return EQUIVALENCES.filter((equiv) => {
    if (type && equiv.type !== type) {
      return false;
    }
    return equiv.ingredient.toLowerCase() === normalized;
  });
}

