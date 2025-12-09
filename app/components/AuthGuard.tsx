"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "./LoadingSpinner";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSupabaseSession();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Pages qui ne nécessitent pas de connexion
  const publicPages = ["/compte", "/login"];

  // IMPORTANT: Tous les hooks doivent être appelés avant tout return conditionnel
  
  // Timeout de sécurité : si le chargement prend plus de 3 secondes, considérer comme non connecté
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  useEffect(() => {
    // Si le chargement est terminé et qu'il n'y a pas d'utilisateur, rediriger
    if (!loading && !user && !hasRedirected && !publicPages.includes(pathname)) {
      setHasRedirected(true);
      router.replace("/login");
    }
  }, [user, loading, router, hasRedirected, pathname]);

  // Si on est sur une page publique, toujours afficher immédiatement (même pendant le chargement)
  if (publicPages.includes(pathname)) {
    return <>{children}</>;
  }

  // Afficher un écran de chargement pendant la vérification (max 3 secondes)
  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Vérification de la session..." />
      </div>
    );
  }

  // Si timeout ou pas d'utilisateur, rediriger vers login
  if (loadingTimeout || !user) {
    if (!hasRedirected) {
      // La redirection sera gérée par le useEffect
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <LoadingSpinner message="Redirection vers la connexion..." />
        </div>
      );
    }
    return null;
  }

  // Utilisateur connecté : afficher le contenu
  return <>{children}</>;
}

