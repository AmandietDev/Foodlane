const mem = new Map<string, { at: number; data: unknown }>();
const DEFAULT_TTL_MS = 60_000;

export async function fetchJsonCached<T>(
  url: string,
  init?: RequestInit,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const key = `${url}|${init?.method ?? "GET"}`;
  const hit = mem.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;

  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as T;
  mem.set(key, { at: Date.now(), data });
  return data;
}
