/**
 * Refgrow — appels côté client (après chargement de latest.js).
 * @see https://refgrow.com — intégration « signup » et widget page.js
 */

type RefgrowFn = (arg0: number, event: string, email: string) => void;

function getRefgrow(): RefgrowFn | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { Refgrow?: RefgrowFn };
  return typeof w.Refgrow === "function" ? w.Refgrow : undefined;
}

/** À appeler après une inscription réussie (email du nouveau compte). */
export function refgrowTrackSignup(email: string): void {
  const em = email?.trim().toLowerCase();
  if (!em || typeof window === "undefined") return;

  const tryOnce = (): boolean => {
    const fn = getRefgrow();
    if (!fn) return false;
    try {
      fn(0, "signup", em);
      return true;
    } catch {
      return false;
    }
  };

  if (tryOnce()) return;
  window.setTimeout(() => {
    if (tryOnce()) return;
    window.setTimeout(() => {
      tryOnce();
    }, 2000);
  }, 600);
}
