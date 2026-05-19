/**
 * Permet aux écrans qui gardent `preferences` en state local de se resynchroniser
 * après un changement d’abonnement (webhook Stripe → Supabase → refreshProfile).
 */
export const SUBSCRIPTION_STATE_CHANGED_EVENT = "foodlane-subscription-state-changed";

export function emitSubscriptionStateChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_STATE_CHANGED_EVENT));
}

export function onSubscriptionStateChanged(handler: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(SUBSCRIPTION_STATE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(SUBSCRIPTION_STATE_CHANGED_EVENT, handler);
}
