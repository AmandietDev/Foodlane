/**
 * Paliers d'abonnement Stripe ↔ variables d'environnement (côté serveur uniquement).
 *
 * Deux familles de Price IDs :
 * - **standard** : tarifs publics après lancement
 * - **founder** : tarif lancement (tant qu'il reste des places — voir `resolveCheckoutPriceId`)
 */

export type SubscriptionTier = "premium" | "premium_plus";
export type BillingInterval = "monthly" | "yearly";
/** Famille de prix Stripe */
export type PriceKind = "standard" | "founder";

export function parseTier(value: string | undefined | null): SubscriptionTier | null {
  if (value === "premium" || value === "premium_plus") return value;
  return null;
}

export function parseInterval(value: string | undefined | null): BillingInterval | null {
  if (value === "monthly" || value === "yearly") return value;
  return null;
}

export function stripeRecurringIntervalToBilling(
  recurring: string | null | undefined
): BillingInterval | null {
  if (recurring === "month") return "monthly";
  if (recurring === "year") return "yearly";
  return null;
}

/** True si ce Price ID appartient à l'offre fondateur (lancement). */
export function isFounderPriceId(priceId: string | null | undefined): boolean {
  if (!priceId) return false;
  const e = process.env;
  return (
    priceId === e.STRIPE_PRICE_ID_PREMIUM_FOUNDER_MENSUEL ||
    priceId === e.STRIPE_PRICE_ID_PREMIUM_FOUNDER_ANNUEL ||
    priceId === e.STRIPE_PRICE_ID_PREMIUM_PLUS_FOUNDER_MENSUEL ||
    priceId === e.STRIPE_PRICE_ID_PREMIUM_PLUS_FOUNDER_ANNUEL
  );
}

export function inferTierIntervalFromPriceId(priceId: string | null): {
  tier: SubscriptionTier | null;
  interval: BillingInterval | null;
} {
  if (!priceId) return { tier: null, interval: null };
  const e = process.env;
  // Standard
  if (priceId === e.STRIPE_PRICE_ID_PREMIUM_MENSUEL) return { tier: "premium", interval: "monthly" };
  if (priceId === e.STRIPE_PRICE_ID_PREMIUM_ANNUEL) return { tier: "premium", interval: "yearly" };
  if (priceId === e.STRIPE_PRICE_ID_PREMIUM_PLUS_MENSUEL) return { tier: "premium_plus", interval: "monthly" };
  if (priceId === e.STRIPE_PRICE_ID_PREMIUM_PLUS_ANNUEL) return { tier: "premium_plus", interval: "yearly" };
  // Fondateur
  if (priceId === e.STRIPE_PRICE_ID_PREMIUM_FOUNDER_MENSUEL) return { tier: "premium", interval: "monthly" };
  if (priceId === e.STRIPE_PRICE_ID_PREMIUM_FOUNDER_ANNUEL) return { tier: "premium", interval: "yearly" };
  if (priceId === e.STRIPE_PRICE_ID_PREMIUM_PLUS_FOUNDER_MENSUEL) return { tier: "premium_plus", interval: "monthly" };
  if (priceId === e.STRIPE_PRICE_ID_PREMIUM_PLUS_FOUNDER_ANNUEL) return { tier: "premium_plus", interval: "yearly" };
  return { tier: null, interval: null };
}

export function resolveTierIntervalFromParts(
  meta: { tier?: string | null; interval?: string | null },
  priceId: string | null,
  recurringInterval: string | null | undefined
): { tier: SubscriptionTier | null; interval: BillingInterval | null } {
  let tier = parseTier(meta.tier ?? null);
  let interval = parseInterval(meta.interval ?? null);
  if (!interval) interval = stripeRecurringIntervalToBilling(recurringInterval ?? null);
  const fromPrice = inferTierIntervalFromPriceId(priceId);
  if (!tier) tier = fromPrice.tier;
  if (!interval) interval = fromPrice.interval;
  return { tier, interval };
}

export function stripePriceIdFor(
  tier: SubscriptionTier,
  interval: BillingInterval,
  kind: PriceKind = "standard"
): string | undefined {
  const e = process.env;
  if (kind === "founder") {
    if (tier === "premium") {
      return interval === "yearly"
        ? e.STRIPE_PRICE_ID_PREMIUM_FOUNDER_ANNUEL
        : e.STRIPE_PRICE_ID_PREMIUM_FOUNDER_MENSUEL;
    }
    return interval === "yearly"
      ? e.STRIPE_PRICE_ID_PREMIUM_PLUS_FOUNDER_ANNUEL
      : e.STRIPE_PRICE_ID_PREMIUM_PLUS_FOUNDER_MENSUEL;
  }
  if (tier === "premium") {
    return interval === "yearly" ? e.STRIPE_PRICE_ID_PREMIUM_ANNUEL : e.STRIPE_PRICE_ID_PREMIUM_MENSUEL;
  }
  return interval === "yearly" ? e.STRIPE_PRICE_ID_PREMIUM_PLUS_ANNUEL : e.STRIPE_PRICE_ID_PREMIUM_PLUS_MENSUEL;
}

export function envKeyForStripePrice(
  tier: SubscriptionTier,
  interval: BillingInterval,
  kind: PriceKind = "standard"
): string {
  if (kind === "founder") {
    if (tier === "premium") {
      return interval === "yearly"
        ? "STRIPE_PRICE_ID_PREMIUM_FOUNDER_ANNUEL"
        : "STRIPE_PRICE_ID_PREMIUM_FOUNDER_MENSUEL";
    }
    return interval === "yearly"
      ? "STRIPE_PRICE_ID_PREMIUM_PLUS_FOUNDER_ANNUEL"
      : "STRIPE_PRICE_ID_PREMIUM_PLUS_FOUNDER_MENSUEL";
  }
  if (tier === "premium") {
    return interval === "yearly"
      ? "STRIPE_PRICE_ID_PREMIUM_ANNUEL"
      : "STRIPE_PRICE_ID_PREMIUM_MENSUEL";
  }
  return interval === "yearly"
    ? "STRIPE_PRICE_ID_PREMIUM_PLUS_ANNUEL"
    : "STRIPE_PRICE_ID_PREMIUM_PLUS_MENSUEL";
}

/**
 * Checkout : utilise le prix fondateur tant qu'il reste des places **et** que les variables founder sont définies.
 * Sinon prix standard (obligatoire).
 */
export function resolveCheckoutPriceId(
  tier: SubscriptionTier,
  interval: BillingInterval,
  foundersSlotsRemaining: number
): { priceId: string | undefined; kind: PriceKind; missingEnvKey?: string } {
  const founderConfigured = Boolean(stripePriceIdFor(tier, interval, "founder"));
  if (foundersSlotsRemaining > 0 && founderConfigured) {
    const id = stripePriceIdFor(tier, interval, "founder");
    if (id) return { priceId: id, kind: "founder" };
  }
  const standardId = stripePriceIdFor(tier, interval, "standard");
  if (!standardId) {
    return {
      priceId: undefined,
      kind: "standard",
      missingEnvKey: envKeyForStripePrice(tier, interval, "standard"),
    };
  }
  return { priceId: standardId, kind: "standard" };
}
