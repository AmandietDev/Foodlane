/**
 * Whitelist bêta testeurs (côté serveur uniquement).
 * Variable : FOODLANE_BETA_EMAILS (emails séparés par des virgules, insensible à la casse).
 */

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseBetaEmailsFromEnv(): string[] {
  const raw = process.env.FOODLANE_BETA_EMAILS || "";
  if (!raw.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((s) => normalizeEmail(s))
    .filter(Boolean);
}

export function isBetaWhitelistedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = parseBetaEmailsFromEnv();
  if (list.length === 0) return false;
  const n = normalizeEmail(email);
  return list.includes(n);
}
