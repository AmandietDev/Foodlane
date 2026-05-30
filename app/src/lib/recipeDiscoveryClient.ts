const STORAGE_KEY = "foodlane_recent_home_recipes";
const MAX_RECENT = 48;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StoredRecent = { ids: number[]; at: number };

export function loadRecentHomeRecipeIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRecent;
    if (!parsed?.ids?.length || Date.now() - (parsed.at || 0) > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.ids.filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

export function rememberHomeRecipeIds(newIds: number[]): void {
  if (typeof window === "undefined" || newIds.length === 0) return;
  const prev = loadRecentHomeRecipeIds();
  const merged = [...newIds, ...prev.filter((id) => !newIds.includes(id))].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids: merged, at: Date.now() }));
  } catch {
    /* quota */
  }
}

/** Rotation légère côté client (page recettes). */
export function rotateScoredRecipes<T extends { id: number }>(
  items: T[],
  limit: number,
  excludeIds: number[] = []
): T[] {
  const exclude = new Set(excludeIds);
  const eligible = items.filter((item) => !exclude.has(item.id));
  const band = eligible.slice(0, Math.max(limit * 4, 24));
  const shuffled = [...band];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const out: T[] = [];
  const used = new Set<number>();
  for (const item of shuffled) {
    if (used.has(item.id)) continue;
    used.add(item.id);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
