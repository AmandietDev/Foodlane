/** Règles mot de passe pour la réinitialisation (min 8, 1 majuscule, 1 chiffre) */
export function isValidResetPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export function resetPasswordRuleHint(): string {
  return "Au moins 8 caractères, une majuscule et un chiffre.";
}
