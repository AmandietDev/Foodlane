/** Extrait les composants d’un repas parsé (JSONB) pour l’analyse hebdo — tolère les anciens formats. */
export function mealParsedComponents(parsed: unknown): {
  protein: string[];
  veggie: string[];
  fruit: string[];
  carb: string[];
  treat: string[];
} {
  const p = parsed as Record<string, unknown> | null | undefined;
  const raw = (p?.components as Record<string, unknown>) || {};
  const arr = (x: unknown): string[] => (Array.isArray(x) ? (x as string[]).filter(Boolean) : []);
  return {
    protein: arr(raw.protein),
    veggie: arr(raw.veggie),
    fruit: arr(raw.fruit),
    carb: arr(raw.carb),
    treat: arr(raw.treat),
  };
}
