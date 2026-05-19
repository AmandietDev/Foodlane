/**
 * Pont de synchronisation entre l'onglet "Foyer" (libellés français côté UI)
 * et les préférences Supabase utilisées par le moteur de génération de menus
 * (clés normalisées en snake_case).
 *
 * Champs synchronisés :
 *  - household_size               ↔ nombrePersonnes
 *  - recipe_scaling_portions     ↔ recipeScalingPortionsMenu
 *  - dietary_filters             ↔ regimesParticuliers (libellés FR)
 *  - excluded_ingredients         ↔ aversionsAlimentaires (texte libre)
 *  - equipment_keys              ↔ equipements (libellés FR)
 *  - objectives                  ↔ objectifsUsage (NUTRITION_GOALS) + flag batch dédié
 *
 * Note : la liste UI des `objectifsUsage` (NUTRITION_GOALS) ne recoupe pas
 * directement les `OBJECTIVE_OPTIONS` du planner. On préserve donc les deux
 * mondes côte à côte côté Supabase : la clé `"batch"` est ajoutée/retirée en
 * fonction d'un toggle dédié ; les autres objectifs nutrition (perte de poids,
 * etc.) restent gérés ailleurs.
 */

// ── Régimes alimentaires ────────────────────────────────────────────────
// UI Foyer ("DietaryProfile" français) → clés Supabase
const DIETARY_PROFILE_TO_FILTER_KEY: Record<string, string> = {
  "Normal": "",
  "Végétarien": "vegetarien",
  "Végétalien": "vegan",
  "Pescétarien": "pescetarien",
  "Sans porc": "sans_porc",
  "Sans lactose": "sans_lactose",
  "Sans gluten": "sans_gluten",
};

// Mapping inverse pour rétro-charger depuis Supabase
const FILTER_KEY_TO_DIETARY_PROFILE: Record<string, string> = Object.entries(
  DIETARY_PROFILE_TO_FILTER_KEY
).reduce<Record<string, string>>((acc, [profile, key]) => {
  if (key) acc[key] = profile;
  return acc;
}, {});

// ── Équipements ─────────────────────────────────────────────────────────
// UI Foyer (libellés FR) → clés Supabase EQUIPMENT_OPTIONS
const EQUIPMENT_LABEL_TO_KEY: Record<string, string> = {
  "Four": "four",
  "Micro-ondes": "micro_ondes",
  "Plaques de cuisson": "plaque_cuisson",
  "Casserole": "", // pas dans la whitelist Supabase (basique)
  "Poêle": "",
  "Mixeur": "blender",
  "Robot mixeur": "blender",
  "Mixeur plongeant": "blender",
  "Robot cuiseur": "robot_cuiseur",
  "Friteuse": "airfryer",
  "Airfryer": "airfryer",
  "Autocuiseur": "autocuiseur",
  "Blender": "blender",
  "Grille-pain": "",
};

const EQUIPMENT_KEY_TO_LABEL: Record<string, string> = {
  four: "Four",
  micro_ondes: "Micro-ondes",
  plaque_cuisson: "Plaques de cuisson",
  blender: "Blender",
  robot_cuiseur: "Robot cuiseur",
  airfryer: "Airfryer",
  autocuiseur: "Autocuiseur",
  // Les clés "spécialisées" (gaufrier, yaourtière…) n'ont pas d'équivalent
  // direct dans la liste UI courte du foyer ; on les ignore côté UI mais on
  // ne les écrase pas si elles sont déjà en base (cf. mergeEquipmentKeys).
};

// ── API publique ────────────────────────────────────────────────────────

export type FoyerSyncableFields = {
  nombrePersonnes: number;
  regimesParticuliers: string[];
  aversionsAlimentaires: string[];
  equipements: string[];
  objectifsUsage: string[];
};

export type SupabasePayloadForSync = {
  household_size: number;
  recipe_scaling_portions: number | null;
  dietary_filters: string[];
  excluded_ingredients: string[];
  equipment_keys: string[];
  objectives: string[];
};

/**
 * Convertit les libellés français des régimes UI vers les clés Supabase,
 * en filtrant ceux qui n'ont pas d'équivalent (ex. "Normal").
 */
export function dietaryProfilesToFilterKeys(profiles: string[]): string[] {
  const keys = new Set<string>();
  for (const p of profiles) {
    const k = DIETARY_PROFILE_TO_FILTER_KEY[p];
    if (k) keys.add(k);
  }
  return [...keys];
}

/**
 * Reconstruit la liste de libellés UI à partir des clés Supabase.
 * Les clés inconnues côté UI (ex. "sans_oeufs") sont ignorées : l'utilisateur
 * peut les éditer dans "Mes préférences" où elles sont gérées finement.
 */
export function filterKeysToDietaryProfiles(keys: string[]): string[] {
  const profiles = new Set<string>();
  for (const k of keys) {
    const p = FILTER_KEY_TO_DIETARY_PROFILE[k];
    if (p) profiles.add(p);
  }
  return [...profiles];
}

export function equipmentLabelsToKeys(labels: string[]): string[] {
  const keys = new Set<string>();
  for (const l of labels) {
    const k = EQUIPMENT_LABEL_TO_KEY[l];
    if (k) keys.add(k);
  }
  return [...keys];
}

export function equipmentKeysToLabels(keys: string[]): string[] {
  const labels = new Set<string>();
  for (const k of keys) {
    const l = EQUIPMENT_KEY_TO_LABEL[k];
    if (l) labels.add(l);
  }
  return [...labels];
}

/**
 * Fusion non destructive des clés d'équipement Supabase : on garde les clés
 * d'origine qui n'ont pas d'équivalent dans le mapping court de l'onglet
 * Foyer (ex. gaufrier, yaourtière…) et on remplace seulement celles que
 * l'utilisateur peut effectivement toucher dans l'onglet Foyer.
 */
export function mergeEquipmentKeys(
  existingSupabaseKeys: string[],
  newKeysFromFoyerUi: string[]
): string[] {
  const editableKeys = new Set(Object.values(EQUIPMENT_LABEL_TO_KEY).filter(Boolean));
  const preserved = existingSupabaseKeys.filter((k) => !editableKeys.has(k));
  return [...new Set([...preserved, ...newKeysFromFoyerUi])];
}

/**
 * Construit le payload Supabase à partir des champs UI Foyer + état Supabase
 * existant (nécessaire pour préserver les valeurs non éditables ici).
 *
 * `batchObjectiveEnabled` est un toggle dédié qui contrôle l'ajout / retrait
 * de la clé `"batch"` dans `objectives`, sans toucher aux autres objectifs.
 */
export function buildSupabasePayloadFromFoyer(
  ui: FoyerSyncableFields,
  existing: {
    objectives: string[];
    equipment_keys: string[];
  },
  batchObjectiveEnabled: boolean
): SupabasePayloadForSync {
  const objectivesSet = new Set(existing.objectives);
  if (batchObjectiveEnabled) objectivesSet.add("batch");
  else objectivesSet.delete("batch");

  const equipmentKeysUi = equipmentLabelsToKeys(ui.equipements);
  const equipment_keys = mergeEquipmentKeys(existing.equipment_keys, equipmentKeysUi);

  return {
    household_size: Math.max(1, Number(ui.nombrePersonnes) || 1),
    recipe_scaling_portions: null, // géré séparément dans l'UI
    dietary_filters: dietaryProfilesToFilterKeys(ui.regimesParticuliers),
    excluded_ingredients: ui.aversionsAlimentaires.map((s) => s.trim()).filter(Boolean),
    equipment_keys,
    objectives: [...objectivesSet],
  };
}
