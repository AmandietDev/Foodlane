/**
 * Lit le paramètre d’URL `next` (ex. après /login?next=/parrainage) en évitant les open redirects.
 * Retourne uniquement un chemin interne commençant par `/`, sans schéma ni `//`.
 */
export function getSafeNextRedirectFromWindow(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const raw = new URLSearchParams(window.location.search).get("next")?.trim();
  if (!raw || !raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  const beforeQuery = raw.split("?")[0] ?? "";
  const path = (beforeQuery.split("#")[0] ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes(":")) return fallback;
  return path === "" ? fallback : path;
}
