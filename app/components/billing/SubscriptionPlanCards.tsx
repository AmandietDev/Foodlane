"use client";

import Link from "next/link";
import { useSubscriptionCheckout } from "../../hooks/useSubscriptionCheckout";

type Props = {
  compact?: boolean;
};

export default function SubscriptionPlanCards({ compact = false }: Props) {
  const {
    user,
    isPremium,
    subscriptionTier,
    billingCycle,
    setBillingCycle,
    checkoutLoading,
    upgradeLoading,
    premiumDisplayPrice,
    plusDisplayPrice,
    useFounderPrices,
    yearlySavingsPercent,
    premiumMonth,
    premiumYear,
    plusMonth,
    plusYear,
    freeDietitianLimit,
    error,
    handleCheckout,
    handleUpgradeToPremiumPlus,
  } = useSubscriptionCheckout();

  const gridClass = compact
    ? "grid gap-4 sm:grid-cols-3"
    : "grid gap-6 lg:grid-cols-3";

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>
      ) : null}
      <div className="flex flex-col items-center gap-2">
        <div
          role="radiogroup"
          className="inline-flex rounded-full border border-[var(--beige-border)] bg-[var(--surface-muted)] p-1"
        >
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              billingCycle === "monthly" ? "bg-white shadow text-[var(--foreground)]" : "text-[var(--text-muted)]"
            }`}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              billingCycle === "yearly" ? "bg-white shadow text-[var(--foreground)]" : "text-[var(--text-muted)]"
            }`}
          >
            Annuel
          </button>
        </div>
      </div>

      <div className={gridClass}>
        <article className="flex flex-col rounded-2xl border border-[var(--beige-border)] bg-[var(--surface)] p-4 text-sm">
          <h3 className="font-bold text-[var(--foreground)]">Gratuit</h3>
          <p className="mt-1 text-xs text-[var(--beige-text-muted)]">Découvrir Foodlane.</p>
          <p className="mt-3 text-2xl font-bold">0 €</p>
          <ul className="mt-3 flex-1 space-y-2 text-xs text-[var(--text-secondary)]">
            <li>✓ Menus limités</li>
            <li>✓ Recettes et favoris limités</li>
            <li>✓ Assistant texte : {freeDietitianLimit} analyses / mois</li>
          </ul>
          <p className="mt-4 rounded-xl border border-dashed border-[var(--beige-border)] px-3 py-2 text-center text-xs text-[var(--text-muted)]">
            Formule actuelle
          </p>
        </article>

        <article className="relative flex flex-col rounded-2xl border-2 border-[#D44A4A] bg-gradient-to-br from-[#D44A4A] to-[#9E3030] p-4 text-white text-sm">
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#C03A3A]">
            Populaire
          </span>
          <h3 className="mt-4 font-bold">Premium</h3>
          <p className="text-xs text-white/90">Menus, courses, recettes sans friction.</p>
          <p className="mt-3 text-2xl font-bold">{premiumDisplayPrice}</p>
          <ul className="mt-3 flex-1 space-y-2 text-xs text-white/95">
            <li>✓ Menus illimités</li>
            <li>✓ Liste de courses avancée</li>
            <li>✓ Assistant diététicien illimité</li>
            <li>✓ Sans publicité</li>
          </ul>
          {isPremium ? (
            <p className="mt-4 rounded-xl bg-white/15 px-3 py-2 text-center text-xs font-semibold">
              {subscriptionTier === "premium_plus" ? "Inclus dans Premium Plus" : "Abonnement actif"}
            </p>
          ) : !user ? (
            <Link
              href="/login"
              className="mt-4 block rounded-xl bg-white py-2.5 text-center text-xs font-bold text-[#C03A3A]"
            >
              Se connecter
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void handleCheckout("premium")}
              disabled={checkoutLoading !== null || upgradeLoading}
              className="mt-4 w-full rounded-xl bg-white py-2.5 text-xs font-bold text-[#C03A3A] disabled:opacity-60"
            >
              {checkoutLoading === "premium" ? "Redirection…" : "S’abonner à Premium"}
            </button>
          )}
        </article>

        <article className="flex flex-col rounded-2xl border border-[var(--beige-border-dark)] bg-[var(--beige-card)] p-4 text-sm">
          <h3 className="font-bold text-[var(--foreground)]">Premium Plus</h3>
          <p className="mt-1 text-xs text-[var(--beige-text-muted)]">Tout Premium + photo & suivi avancé.</p>
          <p className="mt-3 text-2xl font-bold">{plusDisplayPrice}</p>
          <ul className="mt-3 flex-1 space-y-2 text-xs text-[var(--text-secondary)]">
            <li>✓ Tout Premium</li>
            <li>✓ Analyse photo assiette</li>
            <li>✓ Conseils et défis sur mesure</li>
          </ul>
          {subscriptionTier === "premium_plus" ? (
            <p className="mt-4 rounded-xl border border-[var(--beige-border)] px-3 py-2 text-center text-xs font-semibold">
              Abonnement actif
            </p>
          ) : subscriptionTier === "premium" ? (
            <button
              type="button"
              onClick={() => void handleUpgradeToPremiumPlus()}
              disabled={upgradeLoading || checkoutLoading !== null}
              className="mt-4 w-full rounded-xl bg-[#D44A4A] py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {upgradeLoading ? "Mise à niveau…" : "Passer à Premium Plus"}
            </button>
          ) : !user ? (
            <Link
              href="/login"
              className="mt-4 block rounded-xl bg-[#D44A4A] py-2.5 text-center text-xs font-bold text-white"
            >
              Se connecter
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void handleCheckout("premium_plus")}
              disabled={checkoutLoading !== null || upgradeLoading}
              className="mt-4 w-full rounded-xl bg-[#D44A4A] py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {checkoutLoading === "premium_plus" ? "Redirection…" : "S’abonner à Premium Plus"}
            </button>
          )}
        </article>
      </div>
      {useFounderPrices && (
        <p className="text-center text-[11px] text-[#C03A3A] font-medium">
          Tarif fondateur disponible · économie annuelle jusqu’à{" "}
          {yearlySavingsPercent(premiumMonth, premiumYear)} %
        </p>
      )}
    </div>
  );
}
