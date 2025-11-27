"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadPreferences, savePreferences, type UserPreferences } from "../src/lib/userPreferences";
import UserFeedback from "../components/UserFeedback";

export default function PremiumPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  const handleSubscribe = () => {
    if (!preferences) return;

    // Ici, tu peux intégrer un système de paiement réel (Stripe, etc.)
    // Pour l'instant, on simule juste la souscription
    // IMPORTANT: Ajouter la date de début d'abonnement et la date d'expiration (1 mois)
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setMonth(expirationDate.getMonth() + 1); // Ajouter 1 mois
    
    const updated = { 
      ...preferences, 
      abonnementType: "premium" as const,
      premiumStartDate: now.toISOString(), // Date de début de l'abonnement
      premiumExpirationDate: expirationDate.toISOString(), // Date d'expiration (1 mois)
    };
    setPreferences(updated);
    savePreferences(updated);
    
    alert("Abonnement Premium activé ! Il sera valable pendant 1 mois.");
    
    // Redirection vers la page d'accueil après 2 secondes
    setTimeout(() => {
      router.push("/");
    }, 2000);
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
        {/* Mention phase de test */}
        <div className="mt-4 p-3 rounded-xl bg-[#FFD9D9] border border-[#E8A0A0]">
          <p className="text-xs text-center text-[#6B2E2E]">
            <strong>Version de test :</strong> La version de test vous donne accès gratuitement à toutes les fonctionnalités Premium, afin d'améliorer l'application grâce à vos retours.
          </p>
        </div>
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
            <span className="text-3xl font-bold">4,99€</span>
            <span className="text-sm opacity-80">/ mois</span>
          </div>
          <p className="text-xs opacity-75 mt-2">ou 49,99€ / an (économisez 17%)</p>
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
        <button
          onClick={handleSubscribe}
          className="w-full px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors"
        >
          Souscrire à Premium
        </button>
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
          Le paiement s'effectuera via l'App Store ou Google Play selon ta plateforme.
          L'abonnement se renouvelle automatiquement sauf résiliation.
        </p>
      </div>

      {/* Section Retour utilisateur */}
      <UserFeedback />
    </main>
  );
}




