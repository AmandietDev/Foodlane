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
export function formatGroceryDisplayLine(
  ingredientName: string,
  quantity: number | null,
  unit: string | null
): string {
  const name = ingredientName.trim();
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

  const uDisp = unit?.trim() || "";
  return uDisp
    ? `${formatQty(quantity)} ${uDisp} ${deOuD(name)}${name}`
    : `${formatQty(quantity)} ${deOuD(name)}${name}`;
}

export function sortCategoriesForDisplay(keys: string[]): GroceryCategorySlug[] {
  const normalized = keys.map((k) => mapLegacyGroceryCategory(k));
  const unique = [...new Set(normalized)];
  return [
    ...GROCERY_CATEGORY_ORDER.filter((k) => unique.includes(k)),
    ...unique.filter((k) => !GROCERY_CATEGORY_ORDER.includes(k as GroceryCategorySlug)),
  ] as GroceryCategorySlug[];
}
