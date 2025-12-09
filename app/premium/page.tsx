"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadPreferences, savePreferences, type UserPreferences } from "../src/lib/userPreferences";
import { supabase } from "../src/lib/supabaseClient";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

export default function PremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSupabaseSession();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreferences(loadPreferences());
    
    // Vérifier si l'utilisateur revient de Stripe
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    
    if (success) {
      // L'utilisateur a payé avec succès
      // Le webhook Stripe va mettre à jour le statut premium
      // On peut afficher un message de succès
      setError(null);
      // Recharger les préférences après un court délai pour laisser le webhook se déclencher
      setTimeout(() => {
        const updated = loadPreferences();
        setPreferences(updated);
      }, 2000);
    } else if (canceled) {
      setError("Paiement annulé. Tu peux réessayer quand tu veux.");
    }
  }, [searchParams]);

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
          plan: "monthly", // Par défaut, plan mensuel
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
          <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200">
            <p className="text-xs text-center text-green-700">
              ✅ <strong>Paiement réussi !</strong> Ton abonnement Premium est en cours d'activation...
            </p>
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
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-3xl font-bold">9,99€</span>
            <span className="text-sm opacity-80">/ mois</span>
          </div>
          <p className="text-xs opacity-75 mt-2">ou 79€ / an (économisez 34%)</p>
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




