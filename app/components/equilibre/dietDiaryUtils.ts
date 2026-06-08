export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

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
  dinner: { bg: "bg-[#FBF5FF]", ring: "border-[#E8DCF5]", iconBg: "bg-[#F3E8FF]" },
};

export function scoreBalanceLabel(score: number | null): string {
  if (score == null) return "Commence ta journée";
  if (score >= 75) return "Très bon équilibre";
  if (score >= 55) return "Bonne base";
  if (score >= 35) return "En progression";
  return "On consolide ensemble";
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

export function countFilledMealSlots(meals: { meal_type: MealType }[]): number {
  return new Set(meals.map((m) => m.meal_type)).size;
}

export function mealSlotProgress(meals: { meal_type: MealType }[]): number {
  return countFilledMealSlots(meals) / MEAL_TYPES.length;
}
