"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "./useSupabaseSession";
import { usePremium } from "../contexts/PremiumContext";
import { loadPreferences } from "../src/lib/userPreferences";
import { supabase } from "../src/lib/supabaseClient";
import {
  FOUNDER_PLUS_MONTHLY,
  FOUNDER_PLUS_YEARLY,
  FOUNDER_PREMIUM_MONTHLY,
  FOUNDER_PREMIUM_YEARLY,
  PLUS_PRICE_MONTHLY,
  PLUS_PRICE_YEARLY,
  PREMIUM_PRICE_MONTHLY,
  PREMIUM_PRICE_YEARLY,
  formatEur,
  yearlySavingsPercent,
} from "../src/lib/pricingPlans";
import { FREE_DIETITIAN_TEXT_ANALYSES_PER_MONTH } from "../src/lib/freemiumLimits";
import type { SubscriptionTier } from "../src/lib/stripeSubscriptionEnv";

export function useSubscriptionCheckout() {
  const router = useRouter();
  const { user } = useSupabaseSession();
  const { isPremium, subscriptionTier, refreshProfile } = usePremium();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [checkoutLoading, setCheckoutLoading] = useState<SubscriptionTier | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingCtx, setPricingCtx] = useState<{
    showFounderPricing: boolean;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/billing/pricing-context")
      .then((r) => r.json())
      .then((j) => setPricingCtx({ showFounderPricing: Boolean(j.showFounderPricing) }))
      .catch(() => setPricingCtx({ showFounderPricing: false }));
  }, []);

  const useFounderPrices = Boolean(pricingCtx?.showFounderPricing);
  const premiumMonth = useFounderPrices ? FOUNDER_PREMIUM_MONTHLY : PREMIUM_PRICE_MONTHLY;
  const premiumYear = useFounderPrices ? FOUNDER_PREMIUM_YEARLY : PREMIUM_PRICE_YEARLY;
  const plusMonth = useFounderPrices ? FOUNDER_PLUS_MONTHLY : PLUS_PRICE_MONTHLY;
  const plusYear = useFounderPrices ? FOUNDER_PLUS_YEARLY : PLUS_PRICE_YEARLY;

  const premiumDisplayPrice =
    billingCycle === "monthly"
      ? `${formatEur(premiumMonth)}/mois`
      : `${formatEur(premiumYear / 12)}/mois`;
  const plusDisplayPrice =
    billingCycle === "monthly"
      ? `${formatEur(plusMonth)}/mois`
      : `${formatEur(plusYear / 12)}/mois`;

  const handleCheckout = async (tier: SubscriptionTier) => {
    if (!user) {
      setError("Tu dois être connecté pour souscrire.");
      router.push("/login");
      return;
    }
    const preferences = loadPreferences();
    const userEmail = user.email || preferences.email;
    if (!userEmail) {
      setError("Email manquant. Vérifie ton profil.");
      return;
    }
    setCheckoutLoading(tier);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          userId: user.id,
          email: userEmail,
          tier,
          interval: billingCycle,
        }),
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string; details?: string };
        throw new Error(
          [errorData.error, errorData.details].filter(Boolean).join("\n\n") ||
            "Erreur lors de la création de la session de paiement"
        );
      }
      const data = (await response.json()) as { url?: string };
      if (!data.url?.trim()) throw new Error("URL de paiement Stripe manquante.");
      window.location.assign(data.url.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la souscription.");
      setCheckoutLoading(null);
    }
  };

  const handleUpgradeToPremiumPlus = async () => {
    if (!user) return;
    setUpgradeLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; details?: string };
      if (!response.ok) {
        throw new Error([data.error, data.details].filter(Boolean).join("\n\n") || "Mise à niveau impossible.");
      }
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du passage à Premium Plus.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  return {
    user,
    isPremium,
    subscriptionTier,
    billingCycle,
    setBillingCycle,
    checkoutLoading,
    upgradeLoading,
    error,
    setError,
    premiumDisplayPrice,
    plusDisplayPrice,
    useFounderPrices,
    yearlySavingsPercent,
    premiumMonth,
    premiumYear,
    plusMonth,
    plusYear,
    freeDietitianLimit: FREE_DIETITIAN_TEXT_ANALYSES_PER_MONTH,
    handleCheckout,
    handleUpgradeToPremiumPlus,
  };
}
