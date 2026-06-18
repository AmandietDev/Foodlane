/**
 * Parser de repas : convertit un texte libre en structure analysée.
 * Priorité aux expressions multi-mots (ex. « fromage blanc ») pour éviter
 * les découpages erronés (« fromage » + « blanc » → haricots blancs).
 */

const FOOD_DICTIONARY: Record<string, string[]> = {
  protein: [
    "poulet", "poulets", "poulet roti", "poulet grille",
    "viande", "viandes", "boeuf", "steak", "steaks",
    "porc", "jambon", "jambons", "dinde", "dindes",
    "poisson", "poissons", "saumon", "saumons", "thon", "thons",
    "oeuf", "oeufs", "omelette", "omelettes",
    "yaourt", "yaourts", "yogourt", "yogourts",
    "lentilles", "lentille",
    "pois chiches", "pois chiche",
    "haricots rouges", "haricot rouge",
    "haricots blancs", "haricot blanc",
    "tofu", "tofus", "tempeh", "seitan", "quorn",
    "proteine", "proteines",
  ],

  veggie: [
    "salade", "salades", "laitue", "laitues",
    "tomate", "tomates", "carotte", "carottes",
    "courgette", "courgettes", "poivron", "poivrons",
    "epinard", "epinards",
    "brocoli", "brocolis", "chou", "choux", "chou-fleur", "choux-fleurs",
    "haricots verts", "haricot vert", "haricot verts",
    "avocat", "avocats", "concombre", "concombres",
    "oignon", "oignons", "echalote", "echalotes",
    "ail", "aubergine", "aubergines", "courge", "courges",
    "patate douce", "patates douces", "betterave", "betteraves",
    "legume", "legumes", "crudites",
  ],

  carb: [
    "pates", "pasta", "spaghetti", "spaghettis",
    "riz", "riz blanc", "riz complet", "riz basmati",
    "pain", "pains", "baguette", "baguettes", "tartine", "tartines",
    "quinoa", "boulgour", "boulghour", "couscous",
    "pomme de terre", "pommes de terre", "patate", "patates",
    "feculent", "feculents",
    "cereale", "cereales", "flocons d'avoine", "flocons davoine",
  ],

  fruit: [
    "fruit", "fruits", "pomme", "pommes", "banane", "bananes",
    "orange", "oranges", "fraise", "fraises", "raisin", "raisins",
    "kiwi", "kiwis", "mangue", "mangues", "ananas",
    "poire", "poires", "peche", "peches",
    "cerise", "cerises", "myrtille", "myrtilles", "framboise", "framboises",
  ],

  dairy: [
    "lait", "lait entier", "lait demi-ecreme", "lait demiecreme",
    "fromage", "fromages",
    "fromage blanc", "fromages blancs",
    "fromage frais", "fromages frais",
    "yaourt", "yaourts", "yogourt", "yogourts",
    "creme", "creme fraiche",
    "beurre", "beurres",
    "mozzarella", "feta", "chevre",
  ],

  fat: [
    "huile", "huiles", "huile d'olive", "huile dolive", "huile de colza",
    "beurre", "beurres", "margarine",
    "noix", "noisette", "noisettes", "amande", "amandes", "cacahuete", "cacahuetes",
  ],

  treat: [
    "chocolat", "chocolats", "gateau", "gateaux",
    "biscuit", "biscuits", "bonbon", "bonbons", "sucre", "sucres",
    "dessert", "desserts", "glace", "glaces", "nutella",
    "fast food", "fastfood", "burger", "burgers", "frite", "frites",
    "pizza", "pizzas", "kebab", "kebabs", "macdo", "mcdonald",
  ],
};

const ALLERGENS: Record<string, string[]> = {
  gluten: ["ble", "froment", "seigle", "orge", "avoine", "pain", "pains", "pates", "pasta", "biscuit", "biscuits", "gateau"],
  arachide: ["arachide", "cacahuete", "cacahuetes", "cacahuete", "peanut"],
  lactose: ["lait", "fromage", "fromages", "yaourt", "yaourts", "creme", "beurre", "fromage blanc"],
  oeuf: ["oeuf", "oeufs", "omelette", "omelettes"],
  poisson: ["poisson", "poissons", "saumon", "saumons", "thon", "thons", "sardine", "sardines"],
  crustaces: ["crevette", "crevettes", "crabe", "crabes", "homard", "langouste"],
  soja: ["soja", "tofu", "tofus", "tempeh", "sauce soja"],
};

/** Normalise les expressions composées avant le matching. */
const PHRASE_ALIASES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bfromages?\s+blancs?\b/g, replacement: "fromage blanc" },
  { pattern: /\bfromages?\s+frais\b/g, replacement: "fromage frais" },
  { pattern: /\bharicots?\s+blancs?\b/g, replacement: "haricots blancs" },
  { pattern: /\bharicots?\s+verts?\b/g, replacement: "haricots verts" },
  { pattern: /\bharicots?\s+rouges?\b/g, replacement: "haricots rouges" },
  { pattern: /\bpois\s+chiches?\b/g, replacement: "pois chiches" },
  { pattern: /\bpommes?\s+de\s+terre\b/g, replacement: "pomme de terre" },
  { pattern: /\bpatates?\s+douces?\b/g, replacement: "patate douce" },
  { pattern: /\bcremes?\s+fraiches?\b/g, replacement: "creme fraiche" },
  { pattern: /\briz\s+blanc\b/g, replacement: "riz blanc" },
  { pattern: /\briz\s+complet\b/g, replacement: "riz complet" },
  { pattern: /\bhuile\s+d['']olive\b/g, replacement: "huile d'olive" },
  { pattern: /\bflocons\s+d['']avoine\b/g, replacement: "flocons d'avoine" },
  { pattern: /\bchoux?[-\s]fleurs?\b/g, replacement: "chou-fleur" },
];

type DictionaryEntry = { term: string; category: string; normalized: string };

let cachedDictionary: DictionaryEntry[] | null = null;

function buildDictionaryIndex(): DictionaryEntry[] {
  if (cachedDictionary) return cachedDictionary;

  const entries: DictionaryEntry[] = [];
  for (const [category, terms] of Object.entries(FOOD_DICTIONARY)) {
    for (const term of terms) {
      entries.push({
        term,
        category,
        normalized: normalizeText(term),
      });
    }
  }

  entries.sort((a, b) => b.normalized.length - a.normalized.length);
  cachedDictionary = entries;
  return entries;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function applyPhraseAliases(text: string): string {
  let out = text;
  for (const { pattern, replacement } of PHRASE_ALIASES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function isBoundaryChar(char: string | undefined): boolean {
  if (!char) return true;
  return /[\s,;+\-/()0-9]/.test(char);
}

function hasWordBoundary(text: string, start: number, end: number): boolean {
  return isBoundaryChar(text[start - 1]) && isBoundaryChar(text[end]);
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

type PhraseMatch = {
  term: string;
  category: string;
  confidence: number;
  start: number;
  end: number;
};

function findPhraseMatches(text: string): PhraseMatch[] {
  const dictionary = buildDictionaryIndex();
  const matches: PhraseMatch[] = [];
  const occupied: Array<[number, number]> = [];

  for (const entry of dictionary) {
    if (entry.normalized.length < 3) continue;

    let searchFrom = 0;
    while (searchFrom < text.length) {
      const idx = text.indexOf(entry.normalized, searchFrom);
      if (idx === -1) break;

      const end = idx + entry.normalized.length;
      const range: [number, number] = [idx, end];

      if (
        hasWordBoundary(text, idx, end) &&
        !occupied.some((r) => rangesOverlap(r, range))
      ) {
        matches.push({
          term: entry.term,
          category: entry.category,
          confidence: 100,
          start: idx,
          end,
        });
        occupied.push(range);
        break;
      }

      searchFrom = idx + 1;
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

function maskMatchedText(text: string, matches: PhraseMatch[]): string {
  if (matches.length === 0) return text;
  let out = "";
  let cursor = 0;
  for (const match of matches) {
    out += text.slice(cursor, match.start);
    out += " ".repeat(match.end - match.start);
    cursor = match.end;
  }
  out += text.slice(cursor);
  return out;
}

function singularize(word: string): string {
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

function matchesSingleToken(word: string, entry: DictionaryEntry): boolean {
  const normalizedWord = normalizeText(word);
  if (normalizedWord.length < 2) return false;

  const term = entry.normalized;

  if (normalizedWord === term) return true;

  if (term.includes(" ")) return false;

  if (singularize(normalizedWord) === singularize(term)) return true;

  if (normalizedWord.length >= 4 && term.length >= 4) {
    if (normalizedWord === term) return true;
    if (normalizedWord.startsWith(term) || term.startsWith(normalizedWord)) {
      return Math.abs(normalizedWord.length - term.length) <= 2;
    }
  }

  return false;
}

function findSingleTokenMatch(word: string, usedTerms: Set<string>): PhraseMatch | null {
  const dictionary = buildDictionaryIndex();

  for (const entry of dictionary) {
    if (usedTerms.has(`${entry.category}:${entry.term}`)) continue;
    if (!matchesSingleToken(word, entry)) continue;
    return {
      term: entry.term,
      category: entry.category,
      confidence: entry.normalized.includes(" ") ? 100 : 90,
      start: 0,
      end: 0,
    };
  }

  return null;
}

const PROTEIN_RICH_DAIRY = new Set(
  [
    "fromage blanc",
    "fromages blancs",
    "fromage frais",
    "fromages frais",
    "fromage",
    "fromages",
    "yaourt",
    "yaourts",
    "yogourt",
    "yogourts",
    "mozzarella",
    "feta",
    "chevre",
  ].map(normalizeText)
);

function pushComponent(
  components: ParsedMeal["components"],
  category: string,
  term: string
): void {
  const key = category as keyof ParsedMeal["components"];
  if (!(key in components)) return;
  if (!components[key].includes(term)) {
    components[key].push(term);
  }
  if (category === "dairy" && PROTEIN_RICH_DAIRY.has(normalizeText(term))) {
    if (!components.protein.includes(term)) {
      components.protein.push(term);
    }
  }
}

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
  const normalized = applyPhraseAliases(normalizeText(rawText));
  const phraseMatches = findPhraseMatches(normalized);
  const remainingText = maskMatchedText(normalized, phraseMatches);
  const tokens = remainingText.split(/[\s,;+]+/).filter((w) => w.length > 0);

  const items: ParsedMeal["items"] = [];
  const components: ParsedMeal["components"] = {
    protein: [],
    veggie: [],
    carb: [],
    fat: [],
    dairy: [],
    fruit: [],
    treat: [],
  };
  const usedTerms = new Set<string>();

  for (const match of phraseMatches) {
    const key = `${match.category}:${match.term}`;
    if (usedTerms.has(key)) continue;
    usedTerms.add(key);
    items.push({
      name: match.term,
      category: match.category,
      confidence: match.confidence,
    });
    pushComponent(components, match.category, match.term);
  }

  for (const token of tokens) {
    if (token.length < 2) continue;
    const match = findSingleTokenMatch(token, usedTerms);
    if (match) {
      const key = `${match.category}:${match.term}`;
      usedTerms.add(key);
      items.push({
        name: match.term,
        category: match.category,
        confidence: match.confidence,
      });
      pushComponent(components, match.category, match.term);
      continue;
    }

    if (token.length > 2) {
      items.push({
        name: token,
        category: "unknown",
        confidence: 20,
      });
    }
  }

  const detectedAllergens: string[] = [];
  for (const [allergen, terms] of Object.entries(ALLERGENS)) {
    for (const term of terms) {
      const normTerm = normalizeText(term);
      const idx = normalized.indexOf(normTerm);
      if (idx === -1) continue;
      if (!hasWordBoundary(normalized, idx, idx + normTerm.length)) continue;
      if (!detectedAllergens.includes(allergen)) {
        detectedAllergens.push(allergen);
      }
    }
  }

  const dietFlags: string[] = [];
  const notes: string[] = [];

  if (components.protein.length >= 2) dietFlags.push("high_protein");
  if (components.veggie.length >= 2 && components.protein.length >= 1 && components.carb.length >= 1) {
    dietFlags.push("balanced");
  }
  if (components.treat.length > 0) dietFlags.push("has_treats");
  if (components.veggie.length === 0 && components.fruit.length === 0) dietFlags.push("low_fiber");

  if (components.protein.length === 0 && components.carb.length === 0 && components.veggie.length === 0) {
    notes.push("Repas incomplet détecté");
  } else if (components.veggie.length >= 2 && components.protein.length >= 1) {
    notes.push("Repas plutôt complet");
  }

  return {
    items,
    components,
    notes,
    detected_allergens: detectedAllergens,
    diet_flags: dietFlags,
  };
}

export function coerceParsedMeal(raw: unknown): ParsedMeal {
  const emptyComponents: ParsedMeal["components"] = {
    protein: [],
    veggie: [],
    carb: [],
    fat: [],
    dairy: [],
    fruit: [],
    treat: [],
  };
  const empty: ParsedMeal = {
    items: [],
    components: { ...emptyComponents },
    notes: [],
    detected_allergens: [],
    diet_flags: [],
  };

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return empty;
    }
  }
  if (!parsed || typeof parsed !== "object") return empty;

  const p = parsed as Record<string, unknown>;
  const comp = p.components as Record<string, unknown> | undefined;
  const components: ParsedMeal["components"] = { ...emptyComponents };
  if (comp && typeof comp === "object") {
    (Object.keys(emptyComponents) as (keyof typeof emptyComponents)[]).forEach((k) => {
      const v = comp[k as string];
      if (Array.isArray(v)) {
        components[k] = v.filter((x) => typeof x === "string") as string[];
      }
    });
  }

  const items = Array.isArray(p.items) ? (p.items as ParsedMeal["items"]) : [];

  return {
    items,
    components,
    notes: Array.isArray(p.notes) ? (p.notes as string[]) : [],
    detected_allergens: Array.isArray(p.detected_allergens)
      ? (p.detected_allergens as string[])
      : [],
    diet_flags: Array.isArray(p.diet_flags) ? (p.diet_flags as string[]) : [],
  };
}

export function getFoodCategory(foodName: string): string {
  const normalized = applyPhraseAliases(normalizeText(foodName));
  const phraseMatches = findPhraseMatches(normalized);
  if (phraseMatches.length > 0) return phraseMatches[0].category;

  const tokens = normalized.split(/[\s,;+]+/).filter((w) => w.length > 0);
  for (const token of tokens) {
    const match = findSingleTokenMatch(token, new Set());
    if (match) return match.category;
  }

  return "unknown";
}
