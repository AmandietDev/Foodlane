"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loadPreferences, type UserPreferences } from "../src/lib/userPreferences";
import { onSubscriptionStateChanged } from "../src/lib/subscriptionSyncEvents";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { usePremium } from "../contexts/PremiumContext";
import { getSubscriptionAccountMessage } from "../src/lib/subscriptionDisplay";
import { supabase } from "../src/lib/supabaseClient";
import ErrorMessage from "../components/ErrorMessage";
import {
  PLAN_COMPARISON_ROWS,
  PREMIUM_PRICE_MONTHLY,
  PREMIUM_PRICE_YEARLY,
  PLUS_PRICE_MONTHLY,
  PLUS_PRICE_YEARLY,
  FOUNDER_PREMIUM_MONTHLY,
  FOUNDER_PREMIUM_YEARLY,
  FOUNDER_PLUS_MONTHLY,
  FOUNDER_PLUS_YEARLY,
  formatEur,
  yearlySavingsPercent,
} from "../src/lib/pricingPlans";
import { FREE_DIETITIAN_TEXT_ANALYSES_PER_MONTH } from "../src/lib/freemiumLimits";
import type { SubscriptionTier } from "../src/lib/stripeSubscriptionEnv";

const POLL_MS = 2000;
const MAX_POLL_ATTEMPTS = 10;

export default function PremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSupabaseSession();
  const { isPremium, refreshProfile, subscriptionTier, profile } = usePremium();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<SubscriptionTier | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [isActivating, setIsActivating] = useState(false);
  const [activationAttempts, setActivationAttempts] = useState(0);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const portalReturnHandledRef = useRef(false);

  const [pricingCtx, setPricingCtx] = useState<{
    showFounderPricing: boolean;
    founderSlotsRemaining: number;
    foundersLimit: number;
    foundersUsed: number;
    betaWhitelistConfigured?: boolean;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/billing/pricing-context")
      .then((r) => r.json())
      .then((j) =>
        setPricingCtx({
          showFounderPricing: Boolean(j.showFounderPricing),
          founderSlotsRemaining: Number(j.founderSlotsRemaining) || 0,
          foundersLimit: Number(j.foundersLimit) || 100,
          foundersUsed: Number(j.foundersUsed) || 0,
          betaWhitelistConfigured: Boolean(j.betaWhitelistConfigured),
        })
      )
      .catch(() =>
        setPricingCtx({
          showFounderPricing: false,
          founderSlotsRemaining: 0,
          foundersLimit: 100,
          foundersUsed: 0,
        })
      );
  }, []);

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  useEffect(() => {
    return onSubscriptionStateChanged(() => {
      setPreferences(loadPreferences());
    });
  }, []);

  useEffect(() => {
    if (searchParams.get("stripe_portal_return") !== "1") {
      portalReturnHandledRef.current = false;
      return;
    }
    if (portalReturnHandledRef.current) return;
    portalReturnHandledRef.current = true;
    void (async () => {
      await refreshProfile();
      setPreferences(loadPreferences());
    })();
    router.replace("/premium", { scroll: false });
  }, [searchParams, refreshProfile, router]);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const sessionId = searchParams.get("session_id");

    if (success && sessionId) {
      setError(null);
      setIsActivating(true);
      setActivationAttempts(0);
      void refreshProfile();

      pollingIntervalRef.current = setInterval(() => {
        setActivationAttempts((prev) => {
          const next = prev + 1;
          if (next >= MAX_POLL_ATTEMPTS) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setIsActivating(false);
          }
          return next;
        });
        void refreshProfile();
      }, POLL_MS);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
    if (canceled) {
      setError("Paiement annulé. Tu peux réessayer quand tu veux.");
    }
  }, [searchParams, refreshProfile]);

  useEffect(() => {
    if (isPremium && isActivating) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsActivating(false);
      setTimeout(() => router.refresh(), 800);
    }
  }, [isPremium, isActivating, router]);

  const handleCheckout = async (tier: SubscriptionTier) => {
    if (!user) {
      setError("Tu dois être connecté pour souscrire.");
      router.push("/login");
      return;
    }

    if (!preferences) {
      setError("Impossible de charger tes préférences. Recharge la page.");
      return;
    }

    const userEmail = user.email || preferences.email;
    if (!userEmail) {
      setError("Email manquant. Vérifie ton profil.");
      return;
    }

    setCheckoutLoading(tier);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

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
        let message = "Erreur lors de la création de la session de paiement";
        try {
          const errorData = (await response.json()) as { error?: string; details?: string };
          message = [errorData.error, errorData.details].filter(Boolean).join("\n\n") || message;
        } catch {
          const text = await response.text();
          if (text) message = `Erreur serveur (${response.status}): ${text}`;
        }
        throw new Error(message);
      }

      const data = (await response.json()) as { url?: string | null; sessionId?: string };
      const checkoutUrl = typeof data.url === "string" ? data.url.trim() : "";
      if (!checkoutUrl) {
        throw new Error(
          "Stripe n’a pas renvoyé d’URL de paiement. Vérifie STRIPE_SECRET_KEY, les Price IDs et le dashboard Stripe (mode test / live)."
        );
      }
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la souscription.");
      setCheckoutLoading(null);
    }
  };

  const handleUpgradeToPremiumPlus = async () => {
    if (!user) {
      setError("Tu dois être connecté.");
      router.push("/login");
      return;
    }
    setUpgradeLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
      };
      if (!response.ok) {
        const message = [data.error, data.details].filter(Boolean).join("\n\n") || "Mise à niveau impossible.";
        throw new Error(message);
      }
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du passage à Premium Plus.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) {
      setError("Tu dois être connecté.");
      router.push("/login");
      return;
    }
    if (
      !confirm(
        "Tu vas être redirigé vers Stripe pour confirmer la résiliation. Tu reviendras ensuite sur cette page."
      )
    ) {
      return;
    }
    setCancelLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          intent: "cancel_subscription",
          returnTo: "premium",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
        url?: string;
      };
      if (!response.ok) {
        throw new Error([data.error, data.details].filter(Boolean).join("\n\n") || "Impossible d’ouvrir Stripe.");
      }
      if (!data.url) throw new Error("URL Stripe non reçue.");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’ouverture de Stripe.");
    } finally {
      setCancelLoading(false);
    }
  };

  const useFounderPrices = Boolean(pricingCtx?.showFounderPricing);

  const premiumMonth = useFounderPrices ? FOUNDER_PREMIUM_MONTHLY : PREMIUM_PRICE_MONTHLY;
  const premiumYear = useFounderPrices ? FOUNDER_PREMIUM_YEARLY : PREMIUM_PRICE_YEARLY;
  const plusMonth = useFounderPrices ? FOUNDER_PLUS_MONTHLY : PLUS_PRICE_MONTHLY;
  const plusYear = useFounderPrices ? FOUNDER_PLUS_YEARLY : PLUS_PRICE_YEARLY;

  const premiumDisplayPrice =
    billingCycle === "monthly"
      ? `${formatEur(premiumMonth)}/mois`
      : `${formatEur(premiumYear / 12)}/mois`;

  const premiumSecondaryLine =
    billingCycle === "monthly"
      ? `ou ${formatEur(premiumYear)}/an (économise ${yearlySavingsPercent(premiumMonth, premiumYear)} %)`
      : `${formatEur(premiumYear)}/an facturés en une fois · économie ${yearlySavingsPercent(premiumMonth, premiumYear)} % vs mensuel`;

  const plusDisplayPrice =
    billingCycle === "monthly"
      ? `${formatEur(plusMonth)}/mois`
      : `${formatEur(plusYear / 12)}/mois`;

  const plusSecondaryLine =
    billingCycle === "monthly"
      ? `ou ${formatEur(plusYear)}/an (économise ${yearlySavingsPercent(plusMonth, plusYear)} %)`
      : `${formatEur(plusYear)}/an facturés en une fois · économie ${yearlySavingsPercent(plusMonth, plusYear)} % vs mensuel`;

  const showSuccessBanner = Boolean(searchParams.get("success") && !error);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6">
      <header className="mx-auto mb-8 max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Tarifs Foodlane
        </p>
        <h1 className="mt-2 text-balance text-3xl font-bold text-[var(--foreground)] md:text-4xl">
          Choisis la formule qui te ressemble
        </h1>
        <p className="mt-3 text-pretty text-sm text-[var(--beige-text-muted)] md:text-base">
          Gratuit pour découvrir, Premium pour t’organiser au quotidien, Premium Plus pour aller plus
          loin avec l’assistant avancé.
        </p>

        {pricingCtx?.showFounderPricing && (
          <div className="mt-5 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-left text-amber-950 shadow-sm dark:border-amber-700/60 dark:from-amber-950/40 dark:to-orange-950/30 dark:text-amber-50">
            <p className="text-sm font-bold">Offre limitée — tarif à vie</p>
            <p className="mt-1 text-xs leading-relaxed opacity-95">
              Tarif à vie pour les{" "}
              <strong>{pricingCtx.foundersLimit}</strong> premiers abonnements payants —{" "}
              <strong>{pricingCtx.founderSlotsRemaining}</strong> place
              {pricingCtx.founderSlotsRemaining > 1 ? "s" : ""} restante
              {pricingCtx.founderSlotsRemaining > 1 ? "s" : ""}. Ensuite, affichage automatique des tarifs
              standards uniquement (sans changer le prix des membres déjà inscrits).
            </p>
          </div>
        )}

        {!pricingCtx?.showFounderPricing && pricingCtx && pricingCtx.foundersUsed >= pricingCtx.foundersLimit && (
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            L’offre à tarif à vie est close — tarifs standards affichés. Merci aux premiers abonnés pour leur
            confiance.
          </p>
        )}

        {error && (
          <div className="mt-5 text-left">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {showSuccessBanner && (
          <div
            className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100"
            role="status"
            aria-live="polite"
          >
            {isPremium ? (
              <p className="text-sm font-semibold">
                Abonnement actif — merci pour ta confiance. Tu peux profiter de toutes les options
                incluses dans ton offre.
              </p>
            ) : isActivating ? (
              <div className="text-sm">
                <p className="font-semibold">Paiement validé. Activation en cours…</p>
                <p className="mt-1 text-xs opacity-90">
                  Vérification {activationAttempts}/{MAX_POLL_ATTEMPTS}
                </p>
                <button
                  type="button"
                  onClick={() => void refreshProfile().then(() => router.refresh())}
                  className="mt-2 text-xs font-semibold underline underline-offset-2"
                >
                  Actualiser maintenant
                </button>
              </div>
            ) : (
              <div className="text-sm">
                <p className="font-semibold">Paiement réussi</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsActivating(true);
                    void refreshProfile().then(() => router.refresh());
                  }}
                  className="mt-2 text-xs font-semibold underline underline-offset-2"
                >
                  Vérifier l’activation
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Facturation : mensuel / annuel (Premium & affichage Plus) */}
      <div className="mx-auto mb-8 flex max-w-md flex-col items-center gap-2">
        <span id="billing-cycle-label" className="text-xs font-semibold text-[var(--text-muted)]">
          Facturation
        </span>
        <p className="text-center text-[11px] font-medium text-[var(--accent)]">
          Annuel recommandé — plus d’économies sur 12 mois
        </p>
        <div
          role="radiogroup"
          aria-labelledby="billing-cycle-label"
          className="inline-flex rounded-full border border-[var(--beige-border)] bg-[var(--surface-muted)] p-1 shadow-sm"
        >
          <button
            type="button"
            role="radio"
            aria-checked={billingCycle === "monthly"}
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              billingCycle === "monthly"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Mensuel
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={billingCycle === "yearly"}
            onClick={() => setBillingCycle("yearly")}
            className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              billingCycle === "yearly"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Annuel
            <span className="absolute -top-2 -right-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              Top
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
        {/* Gratuit */}
        <article className="flex flex-col rounded-3xl border border-[var(--beige-border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Gratuit</h2>
          <p className="mt-1 text-sm text-[var(--beige-text-muted)]">Pour découvrir Foodlane sans engagement.</p>
          <p className="mt-6 text-3xl font-bold text-[var(--foreground)]">0 €</p>
          <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-[var(--text-secondary)]">
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              <span>Génération de menus limitée</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              <span>Liste de courses simple</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              <span>Recettes, filtres de base et favoris limités</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              <span>
                Assistant diététicien texte : {FREE_DIETITIAN_TEXT_ANALYSES_PER_MONTH} analyses / mois max,
                puis bloqué (pas de photo)
              </span>
            </li>
          </ul>
          <div className="mt-8">
            {user ? (
              <p className="rounded-2xl border border-dashed border-[var(--beige-border)] px-4 py-3 text-center text-sm font-medium text-[var(--text-muted)]">
                Tu es sur la formule gratuite — passe à Premium quand tu veux débloquer la suite.
              </p>
            ) : (
              <Link
                href="/login"
                className="block w-full rounded-2xl border border-[var(--beige-border)] bg-[var(--surface-muted)] py-3 text-center text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)]"
              >
                Créer un compte
              </Link>
            )}
          </div>
        </article>

        {/* Premium — vedette */}
        <article
          className="relative flex flex-col overflow-hidden rounded-3xl border-2 border-[var(--accent)] bg-gradient-to-br from-[#D44A4A] to-[#9E3030] p-6 text-white shadow-xl ring-2 ring-[#D44A4A]/30 lg:scale-[1.02] lg:shadow-2xl"
          aria-labelledby="premium-heading"
        >
          <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#C03A3A] shadow">
            Le plus populaire
          </span>
          <div className="text-center text-3xl" aria-hidden>
            ⭐
          </div>
          <h2 id="premium-heading" className="mt-2 text-center text-xl font-bold">
            Premium
          </h2>
          <p className="mt-1 text-center text-sm text-white/90">Menus, courses et recettes sans friction.</p>
          <p className="mt-6 text-center text-3xl font-bold">{premiumDisplayPrice}</p>
          <p className="mt-2 text-center text-xs text-white/85">{premiumSecondaryLine}</p>
          {useFounderPrices && (
            <p className="mt-2 text-center text-[11px] font-semibold tracking-wide text-amber-100">
              Tarif à vie
            </p>
          )}
          <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-white/95">
            <li>Menus illimités</li>
            <li>Liste de courses avancée + exports illimités</li>
            <li>Tous les filtres recettes et favoris illimités</li>
            <li>Assistant diététicien (texte) illimité</li>
            <li>Sans publicité</li>
          </ul>
          <div className="mt-8 space-y-2">
            {isPremium ? (
              <p className="rounded-2xl bg-white/15 px-4 py-3 text-center text-sm font-semibold backdrop-blur-sm">
                {subscriptionTier === "premium_plus"
                  ? "Tu es sur Premium Plus : tout ce qui est listé ici est déjà inclus."
                  : "Merci — ton abonnement Premium est actif."}
              </p>
            ) : !user ? (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full rounded-2xl bg-white py-3 text-sm font-bold text-[#C03A3A] shadow transition hover:bg-white/95"
              >
                Se connecter pour s’abonner
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleCheckout("premium")}
                disabled={checkoutLoading !== null || upgradeLoading || cancelLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-[#C03A3A] shadow transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkoutLoading === "premium" ? (
                  <>
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#C03A3A] border-t-transparent"
                      aria-hidden
                    />
                    Redirection vers le paiement…
                  </>
                ) : (
                  "S’abonner à Premium"
                )}
              </button>
            )}
          </div>
        </article>

        {/* Premium Plus */}
        <article className="flex flex-col rounded-3xl border border-[var(--beige-border-dark)] bg-[var(--beige-card)] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Premium Plus</h2>
          <p className="mt-1 text-sm text-[var(--beige-text-muted)]">
            Tout Premium, avec l’expérience la plus personnalisée.
          </p>
          <p className="mt-6 text-3xl font-bold text-[var(--foreground)]">{plusDisplayPrice}</p>
          <p className="mt-2 text-xs text-[var(--beige-text-muted)]">{plusSecondaryLine}</p>
          {useFounderPrices && (
            <p className="mt-2 text-center text-[11px] font-semibold tracking-wide text-[#C03A3A]">
              Tarif à vie
            </p>
          )}
          <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-[var(--text-secondary)]">
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              <span>Tout ce qui est inclus dans Premium</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              <span>Analyse photo & suivi avancé (priorité feuille de route)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              <span>Défis et conseils sur mesure</span>
            </li>
          </ul>
          <div className="mt-8 space-y-2">
            {!user ? (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow transition hover:bg-[var(--accent-strong)]"
              >
                Se connecter pour s’abonner
              </button>
            ) : subscriptionTier === "premium_plus" ? (
              <p className="rounded-2xl border border-[var(--beige-border)] bg-[var(--surface-muted)] px-4 py-3 text-center text-sm font-semibold text-[var(--foreground)]">
                Merci — ton abonnement Premium Plus est actif.
              </p>
            ) : subscriptionTier === "premium" ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleUpgradeToPremiumPlus()}
                  disabled={upgradeLoading || cancelLoading || checkoutLoading !== null}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {upgradeLoading ? (
                    <>
                      <span
                        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden
                      />
                      Mise à niveau en cours…
                    </>
                  ) : (
                    "Passer à Premium Plus"
                  )}
                </button>
                <p className="text-center text-xs text-[var(--beige-text-muted)]">
                  Même facturation qu’aujourd’hui (mensuel ou annuel). Stripe applique un prorata sur la
                  différence de prix.
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleCheckout("premium_plus")}
                disabled={checkoutLoading !== null || upgradeLoading || cancelLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkoutLoading === "premium_plus" ? (
                  <>
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                      aria-hidden
                    />
                    Redirection vers le paiement…
                  </>
                ) : (
                  "S’abonner à Premium Plus"
                )}
              </button>
            )}
            {subscriptionTier !== "premium" && (
              <p className="text-center text-xs text-[var(--beige-text-muted)]">
                Paiement sécurisé par Stripe — même compte que pour Premium.
              </p>
            )}
          </div>
        </article>
      </div>

      {/* Tableau comparatif */}
      <section className="mt-14" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="text-xl font-bold text-[var(--foreground)]">
          Comparer en détail
        </h2>
        <p className="mt-1 text-sm text-[var(--beige-text-muted)]">
          Vue d’ensemble des limites et avantages — les quotas exacts du gratuit peuvent évoluer
          légèrement, mais l’esprit reste le même.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--beige-border)] bg-[var(--surface)] shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Comparaison des formules Gratuit, Premium et Premium Plus</caption>
            <thead>
              <tr className="border-b border-[var(--beige-border)] bg-[var(--surface-muted)]">
                <th scope="col" className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  Fonctionnalité
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  Gratuit
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-[#C03A3A]">
                  Premium
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  Premium Plus
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-[var(--border-subtle)] last:border-0">
                  <th scope="row" className="px-4 py-3 font-medium text-[var(--foreground)]">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{row.free}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{row.premium}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{row.plus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isPremium && user && (
        <section
          className="mx-auto mt-12 max-w-2xl rounded-2xl border border-[#E8A0A0] bg-[#FFF8F6] p-5 shadow-sm"
          aria-labelledby="manage-sub-heading"
        >
          <h2 id="manage-sub-heading" className="text-base font-semibold text-[#4a2c2c]">
            Gérer l&apos;abonnement
          </h2>
          <p className="mt-2 text-sm text-[#6B2E2E]">
            {getSubscriptionAccountMessage(profile).statusLine}
          </p>
          {profile?.is_beta_tester ? (
            <p className="mt-2 text-sm text-[#6B2E2E]">{getSubscriptionAccountMessage(profile).detailTu}</p>
          ) : profile?.cancel_at_period_end ? (
            <p className="mt-3 rounded-xl border border-[#E8A0A0] bg-[#FFE8E8] p-3 text-sm font-medium text-[#4a2c2c]">
              {getSubscriptionAccountMessage(profile).detailTu}{" "}
              Pour modifier ta carte ou tes factures, utilise le portail Stripe depuis le menu ou la page
              Compte.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-[#6B2E2E]">
                Clique ci-dessous : tu seras redirigé vers Stripe pour confirmer la résiliation (en général
                en fin de période). Au retour, ton statut sera mis à jour automatiquement. Carte et factures :
                portail Stripe depuis le menu ou la page Compte.
              </p>
              <button
                type="button"
                onClick={() => void handleCancelSubscription()}
                disabled={cancelLoading || upgradeLoading || checkoutLoading !== null}
                className="mt-4 w-full rounded-2xl border border-[#D44A4A] bg-white px-4 py-3 text-sm font-semibold text-[#6B2E2E] transition hover:bg-[#FFF0F0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelLoading ? "Redirection vers Stripe…" : "Résilier mon abonnement"}
              </button>
            </>
          )}
        </section>
      )}

      {/* Régimes — rappel marketing */}
      <section className="mt-10 rounded-3xl border border-[var(--beige-border)] bg-[var(--beige-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Régimes et préférences</h2>
        <p className="mt-2 text-sm text-[var(--beige-text-light)]">
          Avec Premium, débloque tous les réglages alimentaires avancés : végétalien, pescétarien,
          sans gluten, sans lactose, halal, casher, sans porc, et plus encore — pour des menus qui
          collent vraiment à ton quotidien.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Végétalien", "Pescétarien", "Sans gluten", "Sans lactose", "Halal", "Casher", "Sans porc"].map(
            (regime) => (
              <span
                key={regime}
                className="rounded-full border border-[var(--beige-border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--foreground)]"
              >
                {regime}
              </span>
            ),
          )}
        </div>
      </section>

      <footer className="mt-12 space-y-4 border-t border-[var(--beige-border)] pt-8 text-center">
        <p className="text-xs text-[var(--beige-text-muted)]">
          Paiement sécurisé par Stripe. Résiliation possible depuis cette page ou le menu (fin de période) ;
          factures et carte bancaire via le portail Stripe.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/tableau"
            className="inline-flex rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            Retour aux menus
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-2xl border border-[var(--beige-border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)]"
          >
            Accueil
          </Link>
        </div>
      </footer>
    </main>
  );
}
