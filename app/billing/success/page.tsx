"use client";

/**
 * Page de succès après paiement Stripe
 * Rafraîchit automatiquement le statut Premium jusqu'à activation
 */

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePremium } from "../../contexts/PremiumContext";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPremium, refreshProfile, loading } = usePremium();
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [isPolling, setIsPolling] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxPollingAttempts = 10; // 10 tentatives max (environ 20 secondes)

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
    if (!sessionId) {
      // Pas de session_id, rediriger vers premium
      router.push("/premium");
      return;
    }

    // Rafraîchir immédiatement
    refreshProfile();

    // Polling pour vérifier l'activation Premium
    pollingIntervalRef.current = setInterval(async () => {
      setPollingAttempts((prev) => {
        const newAttempts = prev + 1;
        
        if (newAttempts >= maxPollingAttempts) {
          // Arrêter le polling après max tentatives
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsPolling(false);
          return newAttempts;
        }
        
        return newAttempts;
      });
      
      // Rafraîchir le profil
      await refreshProfile();
    }, 2000); // Toutes les 2 secondes

    // Nettoyer l'intervalle au démontage
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [searchParams, refreshProfile, router]);

  // Arrêter le polling si Premium est activé
  useEffect(() => {
    if (isPremium && isPolling) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
      
      // Rediriger vers équilibre après 2 secondes
      setTimeout(() => {
        router.push("/equilibre");
      }, 2000);
    }
  }, [isPremium, isPolling, router]);

  if (loading) {
    return (
      <main className="max-w-md mx-auto px-4 pt-6 pb-24">
        <LoadingSpinner message="Vérification de ton paiement..." />
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        {isPremium ? (
          <>
            <div className="mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                Premium activé !
              </h1>
              <p className="text-sm text-[var(--beige-text-light)] mb-6">
                Ton abonnement Premium est maintenant actif. 
                Tu peux accéder à toutes les fonctionnalités Premium.
              </p>
            </div>
            <div className="w-full max-w-sm space-y-3">
              <button
                onClick={() => router.push("/equilibre")}
                className="w-full px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors"
              >
                Accéder à l'assistant diététicien
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full px-4 py-2 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
              >
                Retour à l'accueil
              </button>
            </div>
          </>
        ) : isPolling ? (
          <>
            <div className="mb-6">
              <div className="text-6xl mb-4">⏳</div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                Paiement validé
              </h1>
              <p className="text-sm text-[var(--beige-text-light)] mb-4">
                Activation en cours...
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#D44A4A]"></div>
                <p className="text-xs text-[var(--beige-text-light)]">
                  Vérification ({pollingAttempts}/{maxPollingAttempts})...
                </p>
              </div>
              <button
                onClick={async () => {
                  await refreshProfile();
                  router.refresh();
                }}
                className="text-xs text-[#D44A4A] underline hover:text-[#C03A3A]"
              >
                Actualiser maintenant
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="text-4xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                Activation en attente
              </h1>
              <p className="text-sm text-[var(--beige-text-light)] mb-6">
                Le paiement a été validé, mais l'activation prend un peu plus de temps. 
                Tu recevras un email de confirmation une fois l'activation terminée.
              </p>
            </div>
            <div className="w-full max-w-sm space-y-3">
              <button
                onClick={async () => {
                  setIsPolling(true);
                  setPollingAttempts(0);
                  await refreshProfile();
                }}
                className="w-full px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors"
              >
                Vérifier à nouveau
              </button>
              <button
                onClick={() => router.push("/premium")}
                className="w-full px-4 py-2 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
              >
                Retour à Premium
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

