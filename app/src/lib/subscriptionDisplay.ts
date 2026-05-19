import type { UserProfile } from "./profile";

/** Format français jj/mm/aaaa (ex. 18/06/2026). */
export function formatDateFrDMY(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Libellés compte / abonnement (premium_active = valeur déjà recalculée côté client dans getProfile).
 */
export function getSubscriptionAccountMessage(profile: UserProfile | null): {
  statusLine: string;
  /** Texte complémentaire (ton tutoiement) pour zones qui affichaient déjà un détail. */
  detailTu?: string;
} {
  if (profile?.is_beta_tester && profile.premium_active) {
    return {
      statusLine:
        "Accès bêta Premium Plus actif (whitelist). Pas de facturation Stripe sur ce compte.",
      detailTu: "Pour retirer l’accès, contacte l’équipe Foodlane.",
    };
  }
  if (!profile?.premium_active) {
    return { statusLine: "Vous n'avez pas d'abonnement actif." };
  }
  if (!profile.cancel_at_period_end) {
    return {
      statusLine: "Votre abonnement est actif.",
      detailTu: "Compte Premium actif.",
    };
  }
  const endIso = profile.current_period_end || profile.premium_end_date;
  const d = formatDateFrDMY(endIso);
  const statusLine = d
    ? `Votre abonnement restera actif jusqu'au ${d}.`
    : "Votre abonnement restera actif jusqu'à la fin de la période payée.";
  return {
    statusLine,
    detailTu: d
      ? `Résiliation enregistrée — tu conserves l'accès jusqu'au ${d}.`
      : "Résiliation enregistrée — tu conserves l'accès jusqu'à la fin de la période payée.",
  };
}
