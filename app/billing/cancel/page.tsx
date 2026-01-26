"use client";

/**
 * Page d'annulation après paiement Stripe
 */

import { useRouter } from "next/navigation";

export default function BillingCancelPage() {
  const router = useRouter();

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            Paiement annulé
          </h1>
          <p className="text-sm text-[var(--beige-text-light)] mb-6">
            Tu as annulé le paiement. Aucun montant n'a été débité.
            Tu peux réessayer quand tu veux.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => router.push("/premium")}
            className="w-full px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors"
          >
            Réessayer
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full px-4 py-2 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </main>
  );
}

