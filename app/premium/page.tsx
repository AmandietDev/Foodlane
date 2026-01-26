"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadPreferences, savePreferences, type UserPreferences } from "../src/lib/userPreferences";
import { supabase } from "../src/lib/supabaseClient";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { usePremium } from "../contexts/PremiumContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

export default function PremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSupabaseSession();
  const { isPremium, refreshProfile, loading: premiumLoading } = usePremium();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [isActivating, setIsActivating] = useState(false);
  const [activationAttempts, setActivationAttempts] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxPollingAttempts = 10; // 10 tentatives max (environ 20 secondes)

  useEffect(() => {
    setPreferences(loadPreferences());
    
    // Vérifier si l'utilisateur revient de Stripe
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const sessionId = searchParams.get("session_id");
    
    if (success && sessionId) {
      // L'utilisateur a payé avec succès
      // Le webhook Stripe va mettre à jour le statut premium
      setError(null);
      setIsActivating(true);
      setActivationAttempts(0);
      
      // Rafraîchir immédiatement
      refreshProfile();
      
      // Polling pour vérifier l'activation Premium
      pollingIntervalRef.current = setInterval(async () => {
        setActivationAttempts((prev) => {
          const newAttempts = prev + 1;
          
          if (newAttempts >= maxPollingAttempts) {
            // Arrêter le polling après max tentatives
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setIsActivating(false);
            return newAttempts;
          }
          
          return newAttempts;
        });
        
        // Rafraîchir le profil (en dehors de setState pour pouvoir utiliser await)
        await refreshProfile();
      }, 2000); // Toutes les 2 secondes
      
      // Nettoyer l'intervalle au démontage
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    } else if (canceled) {
      setError("Paiement annulé. Tu peux réessayer quand tu veux.");
    }
  }, [searchParams, refreshProfile]);

  // Arrêter le polling si Premium est activé
  useEffect(() => {
    if (isPremium && isActivating) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsActivating(false);
      
      // Rediriger vers une page de succès ou rafraîchir après un court délai
      setTimeout(() => {
        router.refresh();
        // Optionnel : rediriger vers une fonctionnalité Premium
        // router.push("/menu-semaine");
      }, 1000);
    }
  }, [isPremium, isActivating, router]);

  const handleSubscribe = async () => {
    // Vérifications préalables
    if (!user) {
      setError("Tu dois être connecté pour souscrire à Premium.");
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

    setLoading(true);
    setError(null);

    try {
      console.log("[Premium] Création de session Stripe pour:", { userId: user.id, email: userEmail });

      // Créer une session Stripe Checkout
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          email: userEmail,
          plan: plan, // Plan choisi par l'utilisateur (monthly ou yearly)
        }),
      });

      console.log("[Premium] Réponse API:", response.status, response.statusText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // Si la réponse n'est pas du JSON, lire le texte
          const errorText = await response.text();
          throw new Error(`Erreur serveur (${response.status}): ${errorText || "Erreur inconnue"}`);
        }

        // Afficher un message d'erreur plus clair pour l'utilisateur
        const errorMessage = errorData.error || "Erreur lors de la création de la session de paiement";
        const errorDetails = errorData.details ? `\n\n${errorData.details}` : "";
        
        console.error("[Premium] Erreur API:", errorMessage, errorDetails);
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      const data = await response.json();
      console.log("[Premium] Données reçues:", data);

      const { url } = data;

      if (!url) {
        console.error("[Premium] URL manquante dans la réponse:", data);
        throw new Error("URL de paiement non reçue. Vérifie la configuration Stripe.");
      }

      console.log("[Premium] Redirection vers Stripe:", url);
      
      // Rediriger vers Stripe Checkout
      window.location.href = url;
    } catch (err) {
      console.error("[Premium] Erreur lors de la souscription:", err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Erreur lors de la souscription. Veuillez réessayer.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const premiumFeatures = [
    {
      title: "Liste de courses automatique",
      description: "Génère automatiquement ta liste de courses selon tes recettes",
      icon: "🛒",
    },
    {
      title: "Régimes alimentaires avancés",
      description: "Accède à tous les régimes : végétalien, pescétarien, sans gluten, sans lactose, halal, casher, etc.",
      icon: "🥗",
    },
    {
      title: "Recettes supplémentaires",
      description: "Accède à une base de données étendue de recettes exclusives",
      icon: "📚",
    },
    {
      title: "Sans publicités",
      description: "Profite d'une expérience sans interruption publicitaire",
      icon: "✨",
    },
    {
      title: "Support prioritaire",
      description: "Bénéficie d'un support client prioritaire pour toutes tes questions",
      icon: "💬",
    },
  ];

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-center text-[var(--foreground)]">
          Passer à Premium
        </h1>
        <p className="text-sm text-center mt-2 text-[var(--beige-text-muted)]">
          Débloque toutes les fonctionnalités avancées de Foodlane
        </p>
        {/* Message de succès ou erreur */}
        {error && (
          <div className="mt-4">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        
        {searchParams.get("success") && !error && (
          <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200">
            {isPremium ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-green-700 mb-2">
                  ✅ <strong>Premium activé !</strong>
                </p>
                <p className="text-xs text-green-600">
                  Ton abonnement Premium est maintenant actif. Tu peux accéder à toutes les fonctionnalités Premium.
                </p>
              </div>
            ) : isActivating ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <p className="text-sm font-semibold text-green-700">
                    Paiement validé. Activation en cours...
                  </p>
                </div>
                <p className="text-xs text-green-600">
                  Nous vérifions ton paiement ({activationAttempts}/{maxPollingAttempts})...
                </p>
                <button
                  onClick={async () => {
                    await refreshProfile();
                    router.refresh();
                  }}
                  className="mt-2 text-xs text-green-700 underline hover:text-green-800"
                >
                  Actualiser maintenant
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-center text-green-700">
                  ✅ <strong>Paiement réussi !</strong> Ton abonnement Premium est en cours d'activation...
                </p>
                <button
                  onClick={async () => {
                    setIsActivating(true);
                    await refreshProfile();
                    router.refresh();
                  }}
                  className="mt-2 text-xs text-green-700 underline hover:text-green-800"
                >
                  Vérifier l'activation
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Bannière Premium */}
      <div className="rounded-2xl bg-gradient-to-br from-[#D44A4A] to-[#C03A3A] p-6 mb-6 text-white">
        <div className="text-center">
          <div className="text-4xl mb-2">⭐</div>
          <h2 className="text-xl font-bold mb-2">Premium</h2>
          <p className="text-sm opacity-90 mb-4">
            Accède à toutes les fonctionnalités avancées
          </p>
          
          {/* Sélection du plan : Mensuel / Annuel */}
          <div className="mb-4">
            <div className="flex gap-2 justify-center mb-3">
              <button
                onClick={() => setPlan("monthly")}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  plan === "monthly"
                    ? "bg-white text-[#D44A4A] shadow-lg"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setPlan("yearly")}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  plan === "yearly"
                    ? "bg-white text-[#D44A4A] shadow-lg"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                Annuel
              </button>
            </div>
            {plan === "yearly" && (
              <p className="text-xs opacity-90 font-semibold">
                💰 Économisez 34% avec l'abonnement annuel
              </p>
            )}
          </div>

          {/* Prix affiché selon le plan */}
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-3xl font-bold">
              {plan === "monthly" ? "9,99€" : "79€"}
            </span>
            <span className="text-sm opacity-80">
              / {plan === "monthly" ? "mois" : "an"}
            </span>
          </div>
          {plan === "monthly" && (
            <p className="text-xs opacity-75 mt-2">ou 79€ / an (économisez 34%)</p>
          )}
        </div>
      </div>

      {/* Fonctionnalités Premium */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
          Ce que tu obtiens avec Premium
        </h3>
        <div className="space-y-3">
          {premiumFeatures.map((feature, index) => (
            <div
              key={index}
              className="rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{feature.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-[var(--foreground)] mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-[var(--beige-text-light)]">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Régimes Premium */}
      <section className="mb-6">
        <div className="rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] p-4">
          <h4 className="font-semibold text-sm text-[var(--foreground)] mb-2">
            Régimes alimentaires Premium
          </h4>
          <p className="text-xs text-[var(--beige-text-light)] mb-3">
            Accède à tous les régimes alimentaires : végétalien, pescétarien, sans gluten, sans lactose, halal, casher, et bien plus encore.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Végétalien", "Pescétarien", "Sans gluten", "Sans lactose", "Halal", "Casher", "Sans porc"].map((regime) => (
              <span
                key={regime}
                className="px-3 py-1 rounded-full bg-[var(--background)] border border-[var(--beige-border)] text-xs text-[var(--foreground)]"
              >
                {regime}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Bouton d'abonnement */}
      <div className="space-y-3">
        {!user ? (
          <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
            <p className="text-sm text-yellow-800 text-center mb-3">
              Tu dois être connecté pour souscrire à Premium.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full px-4 py-2 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors"
            >
              Se connecter
            </button>
          </div>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Redirection vers le paiement...</span>
              </>
            ) : (
              "Souscrire à Premium"
            )}
          </button>
        )}
        <p className="text-xs text-center text-[var(--beige-text-muted)]">
          Annulation possible à tout moment depuis les paramètres de ton compte
        </p>
        <button
          onClick={() => router.push("/")}
          className="w-full px-4 py-2 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>

      {/* Informations légales */}
      <div className="mt-6 pt-6 border-t border-[var(--beige-border)]">
        <p className="text-xs text-center text-[var(--beige-text-muted)]">
          Le paiement s'effectue de manière sécurisée via Stripe.
          L'abonnement se renouvelle automatiquement chaque mois sauf résiliation.
          Tu peux annuler ton abonnement à tout moment depuis les paramètres de ton compte.
        </p>
      </div>

    </main>
  );
}




