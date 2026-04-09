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
  if (/\b(oeuf|oeufs|œuf|œufs|avocat|citron|oignon|banane|pomme|poire)\b/.test(nName)) {
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

const DESCRIPTOR_PATTERNS: RegExp[] = [
  /\bau naturel\b/g,
  /\béminc[ée]?\b/g,
  /\bminc[ée]?\b/g,
  /\bconcass[ée]?\b/g,
  /\bcoup[ée]?\b/g,
  /\bfrais\b/g,
  /\bsec\b/g,
  /\bbio\b/g,
  /\ben conserve\b/g,
  /\bde conserve\b/g,
  /\ben boite\b/g,
  /\bboite\b/g,
  /\bboites\b/g,
  /\bboîte\b/g,
  /\bboîtes\b/g,
  /\bfilet[s]?\b/g,
  /\btranche[s]?\b/g,
  /\bgousse[s]?\b/g,
  /\bpi[eè]ce[s]?\b/g,
];

export function normalizeIngredientNameForMerge(name: string): string {
  let n = normalize(name);
  n = n.replace(/\bde\b/g, " ");
  for (const p of DESCRIPTOR_PATTERNS) n = n.replace(p, " ");

  // Harmonisations sémantiques simples
  n = n.replace(/\bthon(?:\s+au\s+naturel)?\b/g, "thon");
  n = n.replace(/\bail(?:\s+emine)?\b/g, "ail");
  n = n.replace(/\boeufs?\b|\bœufs?\b/g, "oeuf");
  n = n.replace(/\bcitron[s]?\s+verts?\b/g, "citron vert");

  n = n.replace(/\s+/g, " ").trim();
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
    if (qty <= 0.25) return 0.25;
    return Math.ceil(qty * 2) / 2; // demi-pièces max pour rester naturel
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

