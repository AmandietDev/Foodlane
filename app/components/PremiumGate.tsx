"use client";

/**
 * Composant PremiumGate : protège les fonctionnalités Premium
 * 
 * Props:
 * - mode: "page" | "modal" | "disable" | "badge"
 *   - "page": Affiche une page complète de verrouillage
 *   - "modal": Ouvre une modal au clic
 *   - "disable": Désactive le bouton/élément
 *   - "badge": Affiche juste un badge Premium (pas de protection)
 * - children: Contenu à afficher si Premium
 * - fallback: Contenu personnalisé si non Premium (optionnel)
 * - featureName: Nom de la fonctionnalité (pour les messages)
 * - showBadge: Afficher un badge Premium même si Premium (optionnel)
 */

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { usePremium } from "../contexts/PremiumContext";
import LoadingSpinner from "./LoadingSpinner";

interface PremiumGateProps {
  mode: "page" | "modal" | "disable" | "badge";
  children: ReactNode;
  fallback?: ReactNode;
  featureName?: string;
  showBadge?: boolean;
  className?: string;
}

export default function PremiumGate({
  mode,
  children,
  fallback,
  featureName = "cette fonctionnalité",
  showBadge = false,
  className = "",
}: PremiumGateProps) {
  const { isPremium, loading } = usePremium();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  // Pendant le chargement
  if (loading) {
    if (mode === "page") {
      return (
        <main className="max-w-md mx-auto px-4 pt-6 pb-24">
          <LoadingSpinner message="Vérification de ton abonnement..." />
        </main>
      );
    }
    return null;
  }

  // Si Premium : afficher le contenu
  if (isPremium) {
    if (mode === "badge" || showBadge) {
      return (
        <div className={`relative ${className}`}>
          {children}
          <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#D44A4A] text-white text-[10px] font-bold rounded-full">
            PREMIUM
          </span>
        </div>
      );
    }
    return <>{children}</>;
  }

  // Si non Premium : afficher selon le mode
  if (mode === "page") {
    return (
      <main className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
              Fonctionnalité Premium
            </h1>
            <p className="text-sm text-[var(--beige-text-light)] mb-6 max-w-sm">
              {featureName} est réservée aux membres Premium. 
              Débloque toutes les fonctionnalités avancées pour améliorer ton équilibre alimentaire.
            </p>
          </div>

          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={() => router.push("/premium")}
              className="w-full px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors"
            >
              Passer à Premium
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full px-4 py-2 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>

          {/* Avantages Premium */}
          <div className="mt-8 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
              Avec Premium, tu obtiens :
            </h3>
            <div className="space-y-2 text-left">
              <div className="flex items-start gap-2 text-xs text-[var(--beige-text-light)]">
                <span>✅</span>
                <span>Assistant diététicien avec analyse personnalisée</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[var(--beige-text-light)]">
                <span>✅</span>
                <span>Planificateur de menus intelligent avec liste de courses exportable</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[var(--beige-text-light)]">
                <span>✅</span>
                <span>Conseils adaptés à ton profil et tes objectifs</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (mode === "modal") {
    return (
      <>
        <div
          onClick={() => setShowModal(true)}
          className={className}
        >
          {children}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🔒</div>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">
                  Fonctionnalité Premium
                </h3>
                <p className="text-sm text-[var(--beige-text-light)]">
                  {featureName} est réservée aux membres Premium.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    router.push("/premium");
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors"
                >
                  Passer à Premium
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full px-4 py-2 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (mode === "disable") {
    return (
      <div className={`relative ${className}`}>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="px-2 py-1 bg-[#D44A4A] text-white text-[10px] font-bold rounded">
            PREMIUM
          </span>
        </div>
      </div>
    );
  }

  // Mode badge : juste afficher le badge, pas de protection
  if (mode === "badge") {
    return (
      <div className={`relative ${className}`}>
        {children}
        <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#D44A4A] text-white text-[10px] font-bold rounded-full">
          PREMIUM
        </span>
      </div>
    );
  }

  // Fallback par défaut
  return fallback || null;
}

