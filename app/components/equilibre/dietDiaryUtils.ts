export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type LogEntryType = MealType | "hydration";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const HYDRATION_BEVERAGES = [
  "Eau",
  "Café",
  "Thé / tisane",
  "Jus",
  "Boisson gazeuse",
  "Lait / boisson végétale",
  "Autre",
] as const;

export type HydrationBeverage = (typeof HYDRATION_BEVERAGES)[number];

export function formatHydrationEntry(glasses: number, beverage: string): string {
  const label = glasses > 1 ? "verres" : "verre";
  return `${glasses} ${label} · ${beverage}`;
}

export function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

export function logEntryTypeLabel(type: LogEntryType): string {
  if (type === "hydration") return "Hydratation";
  return MEAL_TYPE_LABELS[type];
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍃",
};

/** Couleurs d’icône par créneau (inspiré du mockup, palette Foodlane). */
export const MEAL_TYPE_STYLES: Record<
  MealType,
  { bg: string; ring: string; iconBg: string }
> = {
  breakfast: { bg: "bg-[#FFFBF0]", ring: "border-[#F5E6C8]", iconBg: "bg-[#FFF4DC]" },
  lunch: { bg: "bg-[#FFF8F4]", ring: "border-[#F5DDD0]", iconBg: "bg-[#FFE8DC]" },
  snack: { bg: "bg-[#F6FBF8]", ring: "border-[#D4EDDF]", iconBg: "bg-[#E8F8EE]" },
  dinner: { bg: "bg-[#FFF5F8]", ring: "border-[#F5DDE5]", iconBg: "bg-[#FFE8EE]" },
};

export type NutritionalSummaryInput = {
  score: number;
  strengths: string[];
  priority_tip: string;
  missing_components: string[];
};

/** Commentaire court basé sur la qualité nutritionnelle, pas le nombre de repas. */
export function buildNutritionalQualityComment(
  summary: NutritionalSummaryInput | null,
  hasMealEntries: boolean
): string {
  if (!hasMealEntries) {
    return "Note ton premier repas pour obtenir une analyse de la qualité nutritionnelle de ta journée.";
  }
  if (!summary) {
    return "Analyse de tes apports en cours…";
  }
  if (summary.priority_tip) return summary.priority_tip;
  if (summary.strengths.length > 0) return summary.strengths[0];
  if (summary.missing_components.length > 0) {
    return `Pense à intégrer : ${summary.missing_components.slice(0, 2).join(", ")}.`;
  }
  return scoreBalanceLabel(summary.score);
}

export function scoreBalanceLabel(score: number | null): string {
  if (score == null) return "Commence ta journée";
  if (score >= 75) return "Très bon équilibre";
  if (score >= 55) return "Bonne base";
  if (score >= 35) return "En progression";
  return "On consolide ensemble";
}

export function uniqueLoggedMealTypes(meals: { meal_type: string }[]): MealType[] {
  return [
    ...new Set(
      meals.filter((m) => isMealType(m.meal_type)).map((m) => m.meal_type as MealType)
    ),
  ];
}

function formatLoggedMealsScope(mealTypes: MealType[]): string {
  if (mealTypes.length === 0) return "";
  const labels = mealTypes.map((t) => MEAL_TYPE_LABELS[t].toLowerCase());
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} et ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

export type LoggedMealsScoreContext = {
  scopeLine: string;
  coverageWarning: string | null;
  balanceLabel: string;
};

/** Contexte d'affichage : le score ne porte que sur les repas effectivement saisis. */
export function buildLoggedMealsScoreContext(
  mealsAnalyzed: number,
  mealTypes: MealType[],
  score: number | null
): LoggedMealsScoreContext {
  const scope =
    mealsAnalyzed === 0
      ? ""
      : mealsAnalyzed === 1
        ? `Moyenne sur ${formatLoggedMealsScope(mealTypes)} uniquement`
        : `Moyenne sur ${mealsAnalyzed} repas saisis (${formatLoggedMealsScope(mealTypes)})`;

  let coverageWarning: string | null = null;
  if (mealsAnalyzed === 1) {
    coverageWarning =
      "Ce score reflète la qualité de ce repas, pas de toute ta journée. C'est une bonne base, mais un seul repas enregistré ne suffit pas à juger ton équilibre alimentaire global — pense à noter tes autres repas.";
  } else if (mealsAnalyzed === 2) {
    coverageWarning =
      "Journée partiellement suivie : ce score ne couvre que les repas saisis. Ajoute tes autres repas pour une analyse plus représentative de ta journée.";
  } else if (mealsAnalyzed < 4) {
    coverageWarning =
      "Score calculé uniquement sur les repas enregistrés. Si certains créneaux ne sont pas saisis, il ne reflète pas une journée complète.";
  }

  let balanceLabel = scoreBalanceLabel(score);
  if (mealsAnalyzed === 1 && score != null && score >= 70) {
    balanceLabel = "Bon repas — journée incomplète";
  } else if (mealsAnalyzed < 3 && score != null && score >= 75) {
    balanceLabel = "Bonne qualité sur les repas saisis";
  } else if (mealsAnalyzed < 3 && score != null) {
    balanceLabel = `${scoreBalanceLabel(score)} (repas saisis)`;
  }

  return { scopeLine: scope, coverageWarning, balanceLabel };
}

export function mealSlotStatusLabel(
  mealType: MealType,
  hasEntries: boolean,
  preview?: string
): string {
  if (hasEntries && preview) return preview;
  if (mealType === "breakfast") return "Non renseigné";
  if (mealType === "snack") return "Ajoute ta collation";
  return "Ajoute ton repas";
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDateISO(iso: string, deltaDays: number): string {
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  const y = Number(p[0]);
  const mo = Number(p[1]);
  const da = Number(p[2]);
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + deltaDays);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, "0");
  const nd = String(dt.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

export function formatDiaryDateLabel(iso: string, isToday: boolean): string {
  if (isToday) return "Aujourd'hui";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  const y = Number(p[0]);
  const mo = Number(p[1]);
  const da = Number(p[2]);
  const label = new Date(y, mo - 1, da).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function countFilledMealSlots(meals: { meal_type: string }[]): number {
  return new Set(meals.filter((m) => isMealType(m.meal_type)).map((m) => m.meal_type)).size;
}

export function mealSlotProgress(meals: { meal_type: string }[]): number {
  return countFilledMealSlots(meals) / MEAL_TYPES.length;
}

/** Lundi de la semaine civile (ISO date locale). */
export function getMondayWeekBoundsISO(now = new Date()) {
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  const weekStart = monday.toISOString().split("T")[0];
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  const weekEnd = end.toISOString().split("T")[0];
  return { weekStart, weekEnd };
}

/** Les 7 jours ISO (lun. → dim.) à partir du lundi de la semaine de `anchor`. */
export function getWeekDayISOList(anchor = new Date()): string[] {
  const { weekStart } = getMondayWeekBoundsISO(anchor);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(shiftDateISO(weekStart, i));
  }
  return days;
}

export function formatWeekdayShortFr(isoDate: string): string {
  const p = isoDate.split("-");
  if (p.length !== 3) return isoDate;
  const y = Number(p[0]);
  const mo = Number(p[1]);
  const da = Number(p[2]);
  if (!y || !mo || !da) return isoDate;
  return new Date(y, mo - 1, da).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}
