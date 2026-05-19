/**
 * Accès au widget Refgrow embarqué sur /parrainage (hors portail public Refgrow).
 * Variable serveur uniquement : ne pas préfixer par NEXT_PUBLIC_.
 */

export function parseAffiliateDashboardAllowlist(): string[] {
  const raw = process.env.AFFILIATE_DASHBOARD_EMAILS?.trim();
  if (!raw) return [];
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isEmailAllowedAffiliateDashboard(email: string): boolean {
  const list = parseAffiliateDashboardAllowlist();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}
