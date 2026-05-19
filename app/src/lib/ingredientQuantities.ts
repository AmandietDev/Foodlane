import type { Recipe } from "./recipes";

export type CanonicalUnit = "g" | "ml" | "piece" | "tbsp" | "tsp" | null;

export type ParsedIngredient = {
  raw: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  canonicalUnit: CanonicalUnit;
  canonicalQuantity: number | null;
};

const UNIT_ALIASES: Record<string, CanonicalUnit> = {
  g: "g",
  gr: "g",
  gramme: "g",
  grammes: "g",
  kg: "g",
  ml: "ml",
  cl: "ml",
  dl: "ml",
  l: "ml",
  litre: "ml",
  litres: "ml",
  cuillere: "tbsp",
  cuilleres: "tbsp",
  càs: "tbsp",
  cas: "tbsp",
  "c.a.s": "tbsp",
  "c.à.s": "tbsp",
  cuillereacafe: "tsp",
  cuilleresacafe: "tsp",
  càc: "tsp",
  cac: "tsp",
  "c.a.c": "tsp",
  "c.à.c": "tsp",
  tasse: "ml",
  tasses: "ml",
  piece: "piece",
  pieces: "piece",
  tranche: "piece",
  tranches: "piece",
  gousse: "piece",
  gousses: "piece",
  branche: "piece",
  branches: "piece",
  feuille: "piece",
  feuilles: "piece",
  botte: "piece",
  bottes: "piece",
  tete: "piece",
  tetes: "piece",
  bouquet: "piece",
  bouquets: "piece",
  boite: "piece",
  boites: "piece",
  brique: "piece",
  briques: "piece",
  pot: "piece",
  pots: "piece",
  conserve: "piece",
  oeuf: "piece",
  oeufs: "piece",
  œuf: "piece",
  œufs: "piece",
};

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9./\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumeric(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  // Support "1/2"
  if (/^\d+\s*\/\s*\d+$/.test(t)) {
    const [a, b] = t.split("/").map((x) => Number(x.trim()));
    if (!b) return null;
    return a / b;
  }
  // Support "1 1/2"
  if (/^\d+\s+\d+\s*\/\s*\d+$/.test(t)) {
    const [whole, frac] = t.split(/\s+/, 2);
    const [a, b] = frac.split("/").map(Number);
    if (!b) return null;
    return Number(whole) + a / b;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function inferCanonicalUnit(rawUnit: string | null, ingredientName: string): CanonicalUnit {
  if (rawUnit) {
    const n = normalize(rawUnit).replace(/\s+/g, "");
    if (UNIT_ALIASES[n]) {
      // On unifie c.à.s + c.à.c en base c.à.s pour fusionner facilement les quantités
      return UNIT_ALIASES[n] === "tsp" ? "tbsp" : UNIT_ALIASES[n];
    }
  }
  const nName = normalize(ingredientName);
  if (
    /\b(oeuf|oeufs|avocat|citron|concombre|courgette|aubergine|poivron|poireau|grenade|radis|laitue|roquette|endive|fenouil|asperge|echalote|artichaut|tortilla|bagel|gousse|gousses|pomme de terre|patate douce)\b/.test(
      nName
    )
  ) {
    return "piece";
  }
  if (/\boignon\b/.test(nName) && !/\b(soupe|poudre)\b/.test(nName)) {
    return "piece";
  }
  return null;
}

function toCanonicalQuantity(quantity: number | null, rawUnit: string | null, canonicalUnit: CanonicalUnit): number | null {
  if (quantity == null || canonicalUnit == null) return quantity;
  const nUnit = normalize(rawUnit || "").replace(/\s+/g, "");
  if (canonicalUnit === "g") {
    if (nUnit === "kg") return quantity * 1000;
    return quantity;
  }
  if (canonicalUnit === "ml") {
    if (nUnit === "l" || nUnit === "litre" || nUnit === "litres") return quantity * 1000;
    if (nUnit === "cl") return quantity * 10;
    if (nUnit === "dl") return quantity * 100;
    if (nUnit === "tasse" || nUnit === "tasses") return quantity * 250;
    return quantity;
  }
  if (canonicalUnit === "tbsp") {
    // unifier càc / càs pour permettre la fusion
    if (
      nUnit === "cac" ||
      nUnit === "càc" ||
      nUnit === "c.a.c" ||
      nUnit === "c.a.c." ||
      nUnit.includes("cafe") ||
      nUnit.includes("dessert")
    ) {
      return quantity / 3;
    }
    return quantity;
  }
  if (canonicalUnit === "tsp") {
    if (
      nUnit === "cas" ||
      nUnit === "càs" ||
      nUnit === "c.a.s" ||
      nUnit === "c.a.s." ||
      nUnit.includes("soupe")
    ) {
      return quantity * 3;
    }
    return quantity;
  }
  return quantity;
}

// Descripteurs à supprimer du nom pour permettre la fusion
// (ex: "thon en boîte" + "thon égoutté" → "thon")
const DESCRIPTOR_PATTERNS: RegExp[] = [
  // Conditionnements
  /\bau naturel\b/g,
  /\ba l['' ]huile\b/g,
  /\bnature\b/g,
  /\ben conserve\b/g,
  /\bde conserve\b/g,
  /\ben boite\b/g,
  /\bboite\b/g,
  /\bboites\b/g,
  /\bboite de\b/g,
  /\bconserve\b/g,
  /\ben bocal\b/g,
  /\bbocal\b/g,
  /\ben sachet\b/g,
  /\bsachet\b/g,
  /\ben brique\b/g,
  /\bbrique\b/g,
  /\ben pot\b/g,
  /\bpot\b/g,
  /\ben paquet\b/g,
  /\bpaquet\b/g,
  /\ben morceau[x]?\b/g,
  /\bmorceau[x]?\b/g,
  /\ben tube\b/g,
  /\btube\b/g,

  // États / préparations culinaires
  /\bemine[e]?[s]?\b/g,
  /\bminc[ée][s]?\b/g,
  /\bconcass[ée][s]?\b/g,
  /\bcoup[ée][s]?\b/g,
  /\bhach[ée][s]?\b/g,
  /\brap[ée][s]?\b/g,
  /\bgratt[ée][s]?\b/g,
  /\bpelees?\b/g,
  /\bpel[ée][s]?\b/g,
  /\bepluch[ée][s]?\b/g,
  /\beffeuill[ée][s]?\b/g,
  /\begoutt[ée][s]?\b/g,
  /\bcuits?\b/g,
  /\bfinement\b/g,
  /\bcisel[eée][s]?\b/g,
  /\bescalop[ée][s]?\b/g,
  /\bemiette[s]?\b/g,
  /\bfondu[e]?[s]?\b/g,
  /\brapide[s]?\b/g,
  /\btendre[s]?\b/g,
  /\ben morceau\b/g,
  /\ben cube[s]?\b/g,
  /\bcube[s]?\b/g,
  /\ben de[s]?\b/g,
  /\ben rondelle[s]?\b/g,
  /\brondelle[s]?\b/g,
  /\bdecortique[e]?[s]?\b/g,
  /\bdenoyaut[ée][s]?\b/g,

  // Qualité / origine
  /\bfrais\b/g,
  /\bfraiche\b/g,
  /\bfraiches\b/g,
  /\bsec\b/g,
  /\bsec[hés]+\b/g,
  /\bsurgele[s]?\b/g,
  /\bcongele[s]?\b/g,
  /\bbio\b/g,
  /\bextra\b/g,
  /\bpremier[s]?\b/g,
  /\bpremiere[s]?\b/g,
  /\bvierge\b/g,

  // Quantificateurs / formes
  /\bfilet[s]?\b/g,
  /\btranche[s]?\b/g,
  /\bgousse[s]?\b/g,
  /\bpi[eè]ce[s]?\b/g,
  /\bbouquet[s]?\b/g,
  /\bbrin[s]?\b/g,
  /\bfeuille[s]?\b/g,
  /\bbranche[s]?\b/g,
  /\btete[s]?\b/g,
  /\bgrappe[s]?\b/g,
  /\bportion[s]?\b/g,

  // Mots de liaison
  /\bau\b/g,
  /\baux\b/g,
  /\b[àa] la\b/g,
  /\bavec\b/g,
];

/**
 * Normalise un nom d'ingrédient en vue d'une FUSION dans la liste de courses.
 * Stratégie : retirer tous les descripteurs (conditionnement, état, qualité…)
 * pour ramener "thon en boîte au naturel" et "thon égoutté" à juste "thon".
 *
 * Inclut aussi des harmonisations sémantiques pour les synonymes courants
 * (oeuf/œuf, citron vert/citron lime, etc.).
 */
export function normalizeIngredientNameForMerge(name: string): string {
  let n = normalize(name);
  n = n.replace(/\bde\b/g, " ");
  n = n.replace(/\bd['']/g, " ");
  for (const p of DESCRIPTOR_PATTERNS) n = n.replace(p, " ");

  // ── Harmonisations sémantiques (synonymes / variantes) ─────────────
  n = n.replace(/\boeufs?\b|\boeuf\b/g, "oeuf");
  n = n.replace(/\bcitron[s]?\s+verts?\b/g, "citron vert");
  n = n.replace(/\bcitron[s]?\s+jaunes?\b/g, "citron");
  n = n.replace(/\bcitron[s]?\s+lime[s]?\b/g, "citron vert");
  n = n.replace(/\boignon[s]?\s+rouges?\b/g, "oignon rouge");
  n = n.replace(/\boignon[s]?\s+jaunes?\b/g, "oignon");
  n = n.replace(/\boignon[s]?\s+blancs?\b/g, "oignon blanc");
  n = n.replace(/\boignon\s+nouveau[x]?\b/g, "oignon");
  n = n.replace(/\bpomme[s]?\s+de\s+terre\b/g, "pomme de terre");
  n = n.replace(/\bpatate[s]?\s+douces?\b/g, "patate douce");
  n = n.replace(/\bcourgette[s]?\b/g, "courgette");
  n = n.replace(/\bcarotte[s]?\b/g, "carotte");
  n = n.replace(/\btomate[s]?\s+cerises?\b/g, "tomate cerise");
  n = n.replace(/\btomate[s]?\b/g, "tomate");
  n = n.replace(/\bpoivron[s]?\s+(rouge|jaune|vert|orange)[s]?\b/g, "poivron");
  n = n.replace(/\bpoivron[s]?\b/g, "poivron");
  n = n.replace(/\bcrevette[s]?\b/g, "crevette");
  n = n.replace(/\bsaumon[s]?\s+fum[ée][s]?\b/g, "saumon fume");
  n = n.replace(/\bsaumon[s]?\b/g, "saumon");
  n = n.replace(/\bthon[s]?\b/g, "thon");
  n = n.replace(/\bpoulet[s]?\b/g, "poulet");
  n = n.replace(/\bblanc[s]?\s+de\s+poulet[s]?\b/g, "poulet");
  n = n.replace(/\bescalope[s]?\s+de\s+poulet[s]?\b/g, "poulet");
  n = n.replace(/\bsteak[s]?\s+hach[ée][s]?\b/g, "boeuf hache");
  n = n.replace(/\bviande\s+hach[ée][s]?\b/g, "boeuf hache");
  n = n.replace(/\bboeuf[s]?\b|\bbœuf[s]?\b/g, "boeuf");
  n = n.replace(/\blait[s]?\s+(demi.?ecreme|ecreme|entier|de coco|d['']amande|de soja)\b/g, (_m, t) => `lait ${t}`);
  n = n.replace(/\bcreme[s]?\s+(fraiche[s]?|liquide[s]?|epaisse[s]?|entiere[s]?)\b/g, "creme");
  n = n.replace(/\bfromage[s]?\s+blanc[s]?\b/g, "fromage blanc");
  n = n.replace(/\bail[s]?\b/g, "ail");
  n = n.replace(/\bgingembre[s]?\b/g, "gingembre");
  n = n.replace(/\bbasilic[s]?\b/g, "basilic");
  n = n.replace(/\bpersil[s]?\b/g, "persil");
  n = n.replace(/\bcoriandre[s]?\b/g, "coriandre");
  n = n.replace(/\bmenthe[s]?\b/g, "menthe");
  n = n.replace(/\bsel[s]?\s+(fin|de mer|de guerande)\b/g, "sel");
  n = n.replace(/\bpoivre[s]?\s+(noir|blanc|de timut|moulu)\b/g, "poivre");
  n = n.replace(/\bhuile[s]?\s+d['']olive[s]?\b/g, "huile olive");
  n = n.replace(/\bhuile[s]?\s+de\s+tournesol\b/g, "huile tournesol");
  n = n.replace(/\bhuile[s]?\s+de\s+colza\b/g, "huile colza");
  n = n.replace(/\bhuile[s]?\s+neutre\b/g, "huile neutre");
  n = n.replace(/\bhuile[s]?\s+de\s+sesame\b/g, "huile sesame");

  n = n.replace(/\s+/g, " ").trim();
  // « Huile » seule (souvent huile d’olive en liste) → même fusion que l’huile d’olive
  if (n === "huile") n = "huile olive";
  return n;
}

export function parseIngredientLine(raw: string): ParsedIngredient {
  const source = (raw || "").trim();
  if (!source) {
    return {
      raw: source,
      name: "",
      quantity: null,
      unit: null,
      canonicalUnit: null,
      canonicalQuantity: null,
    };
  }

  const n = normalize(source);
  // Pattern: qty + optional unit + name
  const m = n.match(/^(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\s*\/\s*\d+)\s*([a-zA-Z.àâäéèêëïîôùûüç]+)?\s+(.+)$/i);
  let qty: number | null = null;
  let unit: string | null = null;
  let name = source;

  if (m) {
    qty = parseNumeric(m[1]);
    unit = m[2] || null;
    name = m[3] || source;
  }

  const canonicalUnit = inferCanonicalUnit(unit, name);
  const canonicalQuantity = toCanonicalQuantity(qty, unit, canonicalUnit);
  return {
    raw: source,
    name: name.trim(),
    quantity: qty,
    unit,
    canonicalUnit,
    canonicalQuantity,
  };
}

export function getScalingFactor(recipe: Recipe, householdSize: number): number {
  const base = Number(recipe.nombre_personnes) > 0 ? Number(recipe.nombre_personnes) : 1;
  const target = Math.max(1, Number(householdSize) || base);
  return target / base;
}

export function roundSmartQuantity(qty: number, unit: CanonicalUnit): number {
  if (!Number.isFinite(qty)) return qty;
  if (unit === "piece") {
    // Les ingrédients à la pièce (œuf, citron, oignon, gousse d'ail, pomme...)
    // sont arrondis à l'ENTIER SUPÉRIEUR. Exemple : 2,5 œufs → 3 œufs.
    // C'est nettement plus pratique en cuisine que d'avoir à manipuler des
    // demi-unités d'aliments indivisibles.
    if (qty <= 0) return 0;
    return Math.ceil(qty);
  }
  if (unit === "tbsp" || unit === "tsp") {
    return Math.round(qty * 4) / 4; // pas de 0.25
  }
  if (unit === "g" || unit === "ml") {
    if (qty < 20) return Math.round(qty);
    return Math.round(qty / 5) * 5;
  }
  return Math.round(qty * 10) / 10;
}

export function scaleIngredientQuantity(parsed: ParsedIngredient, factor: number): ParsedIngredient {
  if (parsed.canonicalQuantity == null) return parsed;
  const scaled = roundSmartQuantity(parsed.canonicalQuantity * factor, parsed.canonicalUnit);
  return {
    ...parsed,
    canonicalQuantity: scaled,
  };
}

export function formatScaledIngredient(parsed: ParsedIngredient): string {
  const qty = parsed.canonicalQuantity;
  if (qty == null) return parsed.name;
  const qtyStr = Number.isInteger(qty) ? `${qty}` : `${Math.round(qty * 100) / 100}`;
  const unitLabel =
    parsed.canonicalUnit === "tbsp"
      ? "c.à.s"
      : parsed.canonicalUnit === "tsp"
      ? "c.à.c"
      : parsed.canonicalUnit;
  if (!unitLabel || unitLabel === "piece") return `${qtyStr} ${parsed.name}`.trim();
  return `${qtyStr} ${unitLabel} ${parsed.name}`.trim();
}

