import type { Locale } from "./i18n";
import { normalizeIngredientNameForMerge } from "./ingredientQuantities";

/**
 * Catégories liste de courses (affichage + stockage).
 */
export type GroceryCategorySlug =
  | "fruits_legumes"
  | "proteines"
  | "feculents"
  | "produits_laitiers"
  | "epicerie_salee"
  | "epicerie_sucree"
  | "epices_condiments"
  | "autres";

export const GROCERY_CATEGORY_ORDER: GroceryCategorySlug[] = [
  "fruits_legumes",
  "proteines",
  "feculents",
  "produits_laitiers",
  "epicerie_salee",
  "epicerie_sucree",
  "epices_condiments",
  "autres",
];

export const GROCERY_CATEGORY_LABEL_FR: Record<GroceryCategorySlug, string> = {
  fruits_legumes: "Fruits et légumes",
  proteines: "Protéines",
  feculents: "Féculents",
  produits_laitiers: "Produits laitiers",
  epicerie_salee: "Épicerie salée",
  epicerie_sucree: "Épicerie sucrée",
  epices_condiments: "Épices et condiments",
  autres: "Autres",
};

const GROCERY_CATEGORY_LABEL_EN: Record<GroceryCategorySlug, string> = {
  fruits_legumes: "Fruit & vegetables",
  proteines: "Protein",
  feculents: "Starches",
  produits_laitiers: "Dairy",
  epicerie_salee: "Savory groceries",
  epicerie_sucree: "Sweet groceries",
  epices_condiments: "Spices & condiments",
  autres: "Other",
};

const GROCERY_CATEGORY_LABEL_ES: Record<GroceryCategorySlug, string> = {
  fruits_legumes: "Frutas y verduras",
  proteines: "Proteínas",
  feculents: "Almidones",
  produits_laitiers: "Lácteos",
  epicerie_salee: "Despensa salada",
  epicerie_sucree: "Despensa dulce",
  epices_condiments: "Especias y condimentos",
  autres: "Otros",
};

const GROCERY_CATEGORY_LABEL_DE: Record<GroceryCategorySlug, string> = {
  fruits_legumes: "Obst & Gemüse",
  proteines: "Proteine",
  feculents: "Beilagen / Sättigendes",
  produits_laitiers: "Milchprodukte",
  epicerie_salee: "Herzhafte Vorräte",
  epicerie_sucree: "Süße Vorräte",
  epices_condiments: "Gewürze & Soßen",
  autres: "Sonstiges",
};

export function groceryCategoryLabel(slug: GroceryCategorySlug, locale: Locale): string {
  if (locale === "en") return GROCERY_CATEGORY_LABEL_EN[slug];
  if (locale === "es") return GROCERY_CATEGORY_LABEL_ES[slug];
  if (locale === "de") return GROCERY_CATEGORY_LABEL_DE[slug];
  return GROCERY_CATEGORY_LABEL_FR[slug];
}

/** Anciennes valeurs en base → slug courant */
export function mapLegacyGroceryCategory(cat: string): GroceryCategorySlug {
  const c = (cat || "").toLowerCase();
  const legacy: Record<string, GroceryCategorySlug> = {
    fruits_legumes: "fruits_legumes",
    proteines: "proteines",
    feculents: "feculents",
    produits_laitiers: "produits_laitiers",
    produits_frais: "produits_laitiers",
    epicerie_salee: "epicerie_salee",
    epicerie_sucree: "epicerie_sucree",
    epices_condiments: "epices_condiments",
    surgeles: "autres",
    boissons: "autres",
    divers: "autres",
    autres: "autres",
  };
  return legacy[c] || "autres";
}

export type NormalizedUnit = "g" | "ml" | "càs" | "càc" | "piece" | null;

/**
 * Normalise une unité brute (CSV / saisie) vers une forme d’affichage standard.
 */
export function normalizeGroceryUnit(raw: string | null | undefined): NormalizedUnit {
  if (!raw?.trim()) return null;
  const u = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (u === "kg" || u === "g" || u === "gr" || u === "g." || u === "gramme" || u === "grammes")
    return "g";
  if (u === "l" || u === "ml" || u === "cl" || u === "dl") return "ml";

  if (u === "tbsp" || u === "tbs" || u === "tbs." || u === "tablespoon" || u === "tablespoons")
    return "càs";
  if (u === "tsp" || u === "teaspoon" || u === "teaspoons") return "càc";

  const uDots = u.replace(/\./g, "");
  if (
    u.includes("café") ||
    u.includes("cafe") ||
    u === "cac" ||
    u === "càc" ||
    u === "cc" ||
    u === "c.a.c" ||
    u === "c.a.c." ||
    uDots === "cac" ||
    u.includes("dessert") ||
    u === "pincee" ||
    u === "pincée"
  )
    return "càc";

  if (
    u === "cas" ||
    u === "càs" ||
    u === "cs" ||
    u === "c.a.s" ||
    u === "c.a.s." ||
    uDots === "cas" ||
    u.includes("soupe") ||
    u.includes("table")
  )
    return "càs";

  return "piece";
}

/** Unités stockées / affichées de façon uniforme quand le type est reconnu */
export function canonicalUnitDisplay(nu: NormalizedUnit): string | null {
  if (nu === "g") return "g";
  if (nu === "ml") return "ml";
  if (nu === "càs") return "c.à.s.";
  if (nu === "càc") return "c.à.c.";
  return null;
}

export function displayUnitForStorage(unit: string | null): string | null {
  const n = normalizeGroceryUnit(unit);
  const c = canonicalUnitDisplay(n);
  if (c) return c;
  return unit?.trim() || null;
}

function deOuD(name: string): string {
  const n = name.trim();
  const first = n.charAt(0).toLowerCase();
  if ("aeiouyàâäéèêëîïôœùûüh".includes(first)) return "d'";
  return "de ";
}

function formatQty(q: number): string {
  if (Number.isInteger(q)) return String(q);
  const s = q.toFixed(1);
  return s.endsWith(".0") ? String(Math.round(q)) : s;
}

/**
 * Ligne lisible : « 200 g de tomates », « 2 c.à.s. d’huile d’olive »
 */
function normIngredient(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0153/g, "oe")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "oe")
    .toLowerCase();
}

function isGroceryCookingOilName(name: string): boolean {
  return /\bhuile\b/.test(normIngredient(name));
}

/**
 * Nettoie un libellé d’ingrédient (courses) : enlève morceaux « c. à s. », pièce, préparations, etc.
 * Utilisé à l’affichage pour les données bruitées venant des recettes.
 */
export function sanitizeGroceryIngredientName(raw: string): string {
  let s = (raw || "").replace(/\s+/g, " ").trim();
  if (!s) return s;

  if (s.includes("+")) {
    const parts = s.split(/\s*\+\s*/).map((x) => x.trim()).filter(Boolean);
    if (parts.length === 2) {
      const a = normalizeIngredientNameForMerge(parts[0]!);
      const b = normalizeIngredientNameForMerge(parts[1]!);
      if (a === b && a.length > 0) s = parts[0]!;
    }
  }

  s = s.replace(/\bdail\b/gi, "ail");
  s = s.replace(/\bdhuile\b/gi, "huile");
  s = s.replace(/\bdolive\b/gi, "d'olive");
  s = s.replace(/oeoe+/gi, "oe");
  s = s.replace(/\b1\s+pommes\s+de\s+terre\b/gi, "1 pomme de terre");
  s = s.replace(/\bufs\b/gi, "œufs");
  s = s.replace(/\buf\b/gi, "œuf");
  s = s.replace(/\boignon\s+de\s+rouge\b/gi, "oignon rouge");
  s = s.replace(/\boignon\s+de\s+blanc\b/gi, "oignon blanc");
  s = s.replace(/^\s*legumes?\s+/i, "");

  s = s.replace(/^\d+\s*(piece|pieces|piece\(s\)|pièce|pièces)\s+(d['']|de)\s+/i, "");
  s = s.replace(/^\d+\s*c\.?\s*d['']?\s*(a|à)\s*s(oupe|\.|\.?)\s+/i, "");
  s = s.replace(/^\d+\s*c\s*d['']?\s*a\s*soupe\s+/i, "");
  s = s.replace(/^[ac]\s*[.:]\s*/i, "");

  s = s.replace(
    /\b(c\s*à\s*s|c\s*à\s*c|cuillere[s]?\s+[aà]\s+soupe|à\s*soupe|a\s+soupe|tablespoon|teaspoon)\b/gi,
    " "
  );

  if (!/\b(jambon|saucisse|boeuf|bœuf|veau|porc)\b/gi.test(s)) {
    s = s.replace(/\bcrus?\b/gi, " ");
  }
  s = s.replace(
    /\b(finement|emince|émincé|sans gluten|pour la sauce|quelques|type|ou grill[eé]|grill[eé]|en quartiers?|en dés)\b/gi,
    " "
  );

  s = s.replace(/\s*\+\s*\d+\s*de\s+\w+/gi, " ");
  s = s.replace(/\s*\+\s*\d+\s*g\s+[^+]+$/i, "");
  s = s.replace(/\s*\+\s*\d+\s*g\s+poulet\s*$/i, "");

  s = s.replace(/\b1\s+escalopes\b/gi, "1 escalope");

  s = s.replace(/\blegumes?\s+(\w+)\s+(\w+)\b/i, (_, a: string, b: string) => {
    const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    return `${cap(a)}, ${cap(b)}`;
  });

  s = s.replace(/\b(huile)\s+(d['']olive|dolive)\b/gi, "Huile d'olive");
  s = s.replace(/\bfromage\s+type\s+fol\s+epi\b/gi, "Fromage");
  s = s.replace(/\bmozzarella\s+en\b/gi, "Mozzarella");

  s = s.replace(/\s+(en|ou)\s*$/i, "");
  s = s.replace(/\s+/g, " ").trim();

  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Libellé épices / condiments : uniquement le nom, sans mesures ni « c. à s. ».
 */
export function stripEpicesCondimentsLabel(raw: string): string {
  let s = sanitizeGroceryIngredientName(raw);
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = s.replace(
      /^\d+([.,]\d+)?\s*(c\.?\s*à\s*s\.?|c\.?\s*à\s*c\.?|c\s*à\s*s|c\s*à\s*c|cuillere[s]?\s+[aà]\s+(soupe|caf[eé])|cac|cas|g|mg|ml|cl|dl|l)\s*(d['']|de)?\s*/i,
      ""
    );
    s = s.replace(/^(c\.?\s*à\s*s\.?|c\.?\s*à\s*c\.?|c\s*à\s*s|c\s*à\s*c|a\s*s\.?|a\s*c\.?)\s*(d['']|de)?\s*/i, "");
    if (s === before) break;
  }
  s = s.replace(/\b(c\.?\s*à\s*s\.?|c\.?\s*à\s*c\.?|c\s*à\s*s|c\s*à\s*c|cuillere[s]?\s+[aà]\s+soupe|pinc[ée]e|pincees?)\b/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return sanitizeGroceryIngredientName(raw);
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const DRY_WEIGHT_HINT =
  /\b(quinoa|polenta|riz|pates|pennes|penne|spaghetti|linguine|tagliatelle|lasagne|farine|semoule|couscous|boulgour|chapelure|flocon|feculent|feculents|halloumi|pecorino|parmesan|feta|mozzarella|yaourt|yogourt|creme|fromage|morilles|pignons?|pois chiche|lentille)\b/;

const COUNT_NK = new Set([
  "courgette",
  "oignon",
  "oignon rouge",
  "oignon blanc",
  "avocat",
  "poireau",
  "grenade",
  "radis",
  "laitue",
  "roquette",
  "tomate",
  "tomate cerise",
  "carotte",
  "pomme de terre",
  "patate douce",
  "aubergine",
  "poivron",
  "endive",
  "fenouil",
  "asperge",
  "champignon",
  "navet",
  "betterave",
  "celeri",
  "artichaut",
  "echalote",
  "concombre",
  "citron",
  "citron vert",
  "banane",
  "poire",
  "pomme",
  "ail",
  "brocoli",
  "chou",
  "courge",
  "butternut",
  "epinard",
]);

function shouldFormatAsFrenchCount(
  nUnit: NormalizedUnit,
  unitRaw: string | null,
  whole: number,
  cleaned: string
): boolean {
  const nn = normIngredient(cleaned);
  if (DRY_WEIGHT_HINT.test(nn)) return false;
  if (/\b(jambon|boeuf|bœuf|veau|porc|agneau|poulet|dinde|canard|merguez|chorizo|bacon|lardon)\b/.test(nn)) {
    if (whole > 12) return false;
  }
  if (nUnit === "piece") return true;
  if (unitRaw && /^(piece|pieces|pièce|pièces|gousse|gousses|botte|bottes|tête|tete|bouquet)$/i.test(unitRaw.trim()))
    return true;
  if (nUnit != null) return false;
  const nk = normalizeIngredientNameForMerge(cleaned);
  if (COUNT_NK.has(nk) && whole <= 48) return true;
  if (/\b(tortilla|bagel|brioche|wrap|pain\s+de\s+mie)\b/.test(nn) && whole <= 24) return true;
  return false;
}

function tryFormatFrenchCount(whole: number, cleaned: string): string | null {
  const nk = normalizeIngredientNameForMerge(cleaned);
  const nn = normIngredient(cleaned);

  const byNk: Record<string, (w: number) => string> = {
    courgette: (w) => (w <= 1 ? "1 courgette" : `${w} courgettes`),
    oignon: (w) => (w <= 1 ? "1 oignon" : `${w} oignons`),
    "oignon rouge": (w) => (w <= 1 ? "1 oignon rouge" : `${w} oignons rouges`),
    "oignon blanc": (w) => (w <= 1 ? "1 oignon blanc" : `${w} oignons blancs`),
    avocat: (w) => (w <= 1 ? "1 avocat" : `${w} avocats`),
    poireau: (w) => (w <= 1 ? "1 poireau" : `${w} poireaux`),
    grenade: (w) => (w <= 1 ? "1 grenade" : `${w} grenades`),
    radis: (w) => (w <= 1 ? "1 botte de radis" : `${w} bottes de radis`),
    laitue: (w) => (w <= 1 ? "1 laitue" : `${w} laitues`),
    roquette: () => "Roquette",
    tomate: (w) => (w <= 1 ? "1 tomate" : `${w} tomates`),
    "tomate cerise": (w) => (w <= 1 ? "1 tomate cerise" : `${w} tomates cerises`),
    carotte: (w) => (w <= 1 ? "1 carotte" : `${w} carottes`),
    "pomme de terre": (w) => (w <= 1 ? "1 pomme de terre" : `${w} pommes de terre`),
    "patate douce": (w) => (w <= 1 ? "1 patate douce" : `${w} patates douces`),
    aubergine: (w) => (w <= 1 ? "1 aubergine" : `${w} aubergines`),
    poivron: (w) => (w <= 1 ? "1 poivron" : `${w} poivrons`),
    endive: (w) => (w <= 1 ? "1 endive" : `${w} endives`),
    fenouil: (w) => (w <= 1 ? "1 fenouil" : `${w} fenouils`),
    asperge: (w) => (w <= 1 ? "1 asperge" : `${w} asperges`),
    champignon: (w) => (w <= 1 ? "1 barquette de champignons" : `${w} barquettes de champignons`),
    navet: (w) => (w <= 1 ? "1 navet" : `${w} navets`),
    betterave: (w) => (w <= 1 ? "1 betterave" : `${w} betteraves`),
    celeri: (w) => (w <= 1 ? "1 branche de céleri" : `${w} branches de céleri`),
    artichaut: (w) => (w <= 1 ? "1 artichaut" : `${w} artichauts`),
    echalote: (w) => (w <= 1 ? "1 échalote" : `${w} échalotes`),
    concombre: (w) => (w <= 1 ? "1 concombre" : `${w} concombres`),
    citron: (w) => (w <= 1 ? "1 citron" : `${w} citrons`),
    "citron vert": (w) => (w <= 1 ? "1 citron vert" : `${w} citrons verts`),
    banane: (w) => (w <= 1 ? "1 banane" : `${w} bananes`),
    poire: (w) => (w <= 1 ? "1 poire" : `${w} poires`),
    pomme: (w) => (w <= 1 ? "1 pomme" : `${w} pommes`),
    ail: (w) => (w <= 1 ? "1 gousse d'ail" : `${w} gousses d'ail`),
    brocoli: (w) => (w <= 1 ? "1 brocoli" : `${w} brocolis`),
    chou: (w) => (w <= 1 ? "1 chou" : `${w} choux`),
    courge: (w) => (w <= 1 ? "1 courge" : `${w} courges`),
    butternut: (w) => (w <= 1 ? "1 butternut" : `${w} butternuts`),
    epinard: (w) => (w <= 1 ? "1 botte d'épinards" : `${w} bottes d'épinards`),
  };
  if (byNk[nk]) return byNk[nk](whole);

  if (/\boeufs?\b/.test(nn)) return whole <= 1 ? "1 œuf" : `${whole} œufs`;

  if (/\bveau\b/.test(nn) && /\bescalope\b/.test(nn))
    return whole <= 1 ? "1 escalope de veau" : `${whole} escalopes de veau`;
  if (/\bpoulet\b/.test(nn) && /\bescalope\b/.test(nn))
    return whole <= 1 ? "1 escalope de poulet" : `${whole} escalopes de poulet`;

  if (/\bciabatta\b/.test(nn) && /\bpain\b/.test(nn))
    return whole <= 1 ? "1 pain ciabatta" : `${whole} pains ciabatta`;
  if (/\bbagel\b/.test(nn))
    return whole <= 1 ? "1 bagel" : `${whole} bagels`;
  if (/\btortilla\b/.test(nn))
    return whole <= 1 ? "1 tortilla" : `${whole} tortillas`;
  if (/\bbrioche\b/.test(nn))
    return whole <= 1 ? "1 brioche" : `${whole} brioches`;
  if (/\bpain\s+de\s+mie\b/.test(nn))
    return whole <= 1 ? "1 pain de mie" : `${whole} pains de mie`;
  if (/\bwrap\b/.test(nn)) return whole <= 1 ? "1 wrap" : `${whole} wraps`;

  return null;
}

/**
 * Formulations proches du supermarché (quantités entières, paquets, grammages ronds).
 */
export function formatGroceryStoreLine(
  ingredientName: string,
  quantity: number | null,
  unit: string | null,
  locale: Locale = "fr",
  category?: GroceryCategorySlug | null
): string {
  const name = sanitizeGroceryIngredientName(ingredientName.trim());
  if (!name) return "";
  if (category === "epices_condiments" && !isGroceryCookingOilName(name)) {
    return stripEpicesCondimentsLabel(name);
  }
  if (quantity == null || quantity <= 0) return name;

  const nn = normIngredient(name);
  const nUnit = normalizeGroceryUnit(unit);

  if (nUnit === "g") {
    let q = quantity;
    if (/\bfromage blanc\b/.test(nn) && q >= 500) {
      const kg = q / 1000;
      const roundedKg = kg >= 1 ? Math.max(1, Math.round(kg * 2) / 2) : Math.round(q / 100) / 10;
      if (locale === "fr") {
        if (roundedKg >= 1) return `${formatQty(roundedKg)} kg ${deOuD(name)}${name}`;
        return `${formatQty(Math.round(q / 50) * 50)} g ${deOuD(name)}${name}`;
      }
      if (roundedKg >= 1) return `${formatQty(roundedKg)} kg ${deOuD(name)}${name}`;
      return `${formatQty(Math.round(q / 50) * 50)} g ${deOuD(name)}${name}`;
    }
    if (q >= 1000 && !/\b(oeuf|citron|oignon|concombre|avocat)\b/.test(nn)) {
      const kg = q / 1000;
      const rk = Math.max(0.5, Math.round(kg * 4) / 4);
      if (locale === "fr") return `${formatQty(rk)} kg ${deOuD(name)}${name}`;
      if (locale === "en") return `${formatQty(rk)} kg ${deOuD(name)}${name}`;
      if (locale === "es") return `${formatQty(rk)} kg ${deOuD(name)}${name}`;
      return `${formatQty(rk)} kg ${deOuD(name)}${name}`;
    }
    if (/\b(farine|sucre|riz|semoule|chapelure|amande|noix de coco)\b/.test(nn)) {
      q = Math.round(q / 25) * 25;
      if (q < 25 && quantity > 0) q = 25;
    } else {
      q = Math.round(q / 5) * 5;
      if (q === 0 && quantity > 0) q = Math.round(quantity);
    }
    return formatGroceryDisplayLine(name, q, "g");
  }

  if (nUnit === "ml") {
    let q = Math.round(quantity / 25) * 25;
    if (q === 0 && quantity > 0) q = Math.round(quantity);
    return formatGroceryDisplayLine(name, q, "ml");
  }

  if (nUnit === "càs" || nUnit === "càc") {
    const mlPer = nUnit === "càc" ? 5 : 15;
    let q = Math.round((quantity * mlPer) / 25) * 25;
    if (q === 0 && quantity > 0) q = Math.max(25, Math.round(quantity * mlPer));
    if (/\b(huile|vinaigre|sauce|lait|creme|jus|sirop|eau|vin|liqueur)\b/.test(nn)) {
      if (q >= 1000) {
        const l = q / 1000;
        const rl = Math.max(0.25, Math.round(l * 4) / 4);
        if (locale === "fr") return `${formatQty(rl)} L ${deOuD(name)}${name}`;
        return `${formatQty(rl)} L ${deOuD(name)}${name}`;
      }
      return formatGroceryDisplayLine(name, q, "ml");
    }
    q = Math.round((quantity * (nUnit === "càc" ? 8 : 12)) / 5) * 5;
    if (q === 0 && quantity > 0) q = Math.round(quantity * (nUnit === "càc" ? 8 : 12));
    return formatGroceryDisplayLine(name, q, "g");
  }

  const whole = Math.max(1, Math.ceil(quantity));

  if (/\bbaguette\b/.test(nn)) {
    if (locale === "fr") return `${whole} baguette${whole > 1 ? "s" : ""}`;
    if (locale === "en") return `${whole} baguette${whole > 1 ? "s" : ""}`;
    if (locale === "es") return `${whole} baguette${whole > 1 ? "s" : ""}`;
    return `${whole} Baguette${whole > 1 ? "n" : ""}`;
  }

  if (/\boeuf\b/.test(nn)) {
    if (locale === "fr") return `${whole} œuf${whole > 1 ? "s" : ""}`;
    if (locale === "en") return `${whole} egg${whole > 1 ? "s" : ""}`;
    if (locale === "es") return `${whole} huevo${whole > 1 ? "s" : ""}`;
    return `${whole} Ei${whole > 1 ? "er" : ""}`;
  }

  if (/\bcitron\b/.test(nn)) {
    const yellow = /jaune|yellow|amarillo/.test(nn);
    const green = /vert|green|lima/.test(nn);
    if (locale === "fr") {
      if (yellow) return `${whole} citron${whole > 1 ? "s" : ""} jaunes`;
      if (green) return `${whole} citron${whole > 1 ? "s" : ""} verts`;
      return `${whole} citron${whole > 1 ? "s" : ""}`;
    }
    if (locale === "en") {
      if (yellow) return `${whole} yellow lemon${whole > 1 ? "s" : ""}`;
      if (green) return `${whole} lime${whole > 1 ? "s" : ""}`;
      return `${whole} lemon${whole > 1 ? "s" : ""}`;
    }
    if (locale === "es") {
      if (yellow) return `${whole} limón${whole > 1 ? "es" : ""} amarillo${whole > 1 ? "s" : ""}`;
      if (green) return `${whole} lima${whole > 1 ? "s" : ""}`;
      return `${whole} limón${whole > 1 ? "es" : ""}`;
    }
    if (yellow) return `${whole} gelbe Zitrone${whole > 1 ? "n" : ""}`;
    if (green) return `${whole} Limette${whole > 1 ? "n" : ""}`;
    return `${whole} Zitrone${whole > 1 ? "n" : ""}`;
  }

  if (/\bconcombre\b/.test(nn)) {
    if (locale === "fr") return `${whole} concombre${whole > 1 ? "s" : ""}`;
    if (locale === "en") return `${whole} cucumber${whole > 1 ? "s" : ""}`;
    if (locale === "es") return `${whole} pepino${whole > 1 ? "s" : ""}`;
    return `${whole} Gurke${whole > 1 ? "n" : ""}`;
  }

  if (
    /\bthon\b/.test(nn) &&
    /\b(boite|boîte|lata|can|conserve|thon en conserve)\b/.test(nn) &&
    !/\b(thon rouge|thon frais|filet de thon|steak de thon)\b/.test(nn)
  ) {
    if (locale === "fr") return `${whole} boîte${whole > 1 ? "s" : ""} de thon`;
    if (locale === "en") return `${whole} can${whole > 1 ? "s" : ""} of tuna`;
    if (locale === "es") return `${whole} lata${whole > 1 ? "s" : ""} de atún`;
    return `${whole} Dose${whole > 1 ? "n" : ""} Thunfisch`;
  }

  if (locale === "fr" && shouldFormatAsFrenchCount(nUnit, unit, whole, name)) {
    const fr = tryFormatFrenchCount(whole, name);
    if (fr) return fr;
  }

  return formatGroceryDisplayLine(name, whole, unit);
}

export function formatGroceryDisplayLine(
  ingredientName: string,
  quantity: number | null,
  unit: string | null
): string {
  const name = sanitizeGroceryIngredientName(ingredientName.trim());
  if (!name) return "";
  if (quantity == null || quantity <= 0) return name;

  const nUnit = normalizeGroceryUnit(unit);

  if (nUnit === "g") {
    return `${formatQty(quantity)} g ${deOuD(name)}${name}`;
  }
  if (nUnit === "ml") {
    return `${formatQty(quantity)} ml ${deOuD(name)}${name}`;
  }
  if (nUnit === "càs") {
    return `${formatQty(quantity)} c.à.s. ${deOuD(name)}${name}`;
  }
  if (nUnit === "càc") {
    return `${formatQty(quantity)} c.à.c. ${deOuD(name)}${name}`;
  }

  let uDisp = unit?.trim() || "";
  if (/^(piece|pieces|pièce|pièces)$/i.test(uDisp)) {
    return `${formatQty(quantity)} ${name}`;
  }
  if (uDisp) {
    return `${formatQty(quantity)} ${uDisp} ${deOuD(name)}${name}`;
  }
  return `${formatQty(quantity)} ${deOuD(name)}${name}`;
}

export function sortCategoriesForDisplay(keys: string[]): GroceryCategorySlug[] {
  const normalized = keys.map((k) => mapLegacyGroceryCategory(k));
  const unique = [...new Set(normalized)];
  return [
    ...GROCERY_CATEGORY_ORDER.filter((k) => unique.includes(k)),
    ...unique.filter((k) => !GROCERY_CATEGORY_ORDER.includes(k as GroceryCategorySlug)),
  ] as GroceryCategorySlug[];
}
