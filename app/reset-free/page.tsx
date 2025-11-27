"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resetToFreePlan } from "../src/lib/userPreferences";

export default function ResetFreePage() {
  const router = useRouter();

  useEffect(() => {
    // Réinitialiser à free immédiatement
    resetToFreePlan();
    
    // Rediriger vers la page d'accueil après 1 seconde
    const timer = setTimeout(() => {
      router.push("/");
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-32">
      <header className="mb-6">
      </header>
      <div className="bg-[var(--beige-card)] rounded-lg p-6 shadow-sm border border-[var(--beige-border)] text-center">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-4">
          Réinitialisation en cours...
        </h1>
        <p className="text-[var(--beige-text-light)]">
          Passage au plan free effectué. Redirection vers l'accueil...
        </p>
      </div>
    </main>
  );
}


