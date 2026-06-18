"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "./LoadingSpinner";
import { isPublicPath } from "../src/lib/publicRoutes";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSupabaseSession();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const isPublic = isPublicPath(pathname);

  // IMPORTANT: Tous les hooks doivent être appelés avant tout return conditionnel
  
  // Aligné sur getSessionResilient (~12 s) : éviter d’abandonner avant la fin de l’appel Supabase
  const SESSION_CHECK_MAX_MS = 15000;

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, SESSION_CHECK_MAX_MS);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  useEffect(() => {
    // Si le chargement est terminé et qu'il n'y a pas d'utilisateur, rediriger
    if (!loading && !user && !hasRedirected && !isPublic) {
      setHasRedirected(true);
      router.replace("/login");
    }
  }, [user, loading, router, hasRedirected, pathname, isPublic]);

  // Si on est sur une page publique, toujours afficher immédiatement (même pendant le chargement)
  if (isPublic) {
    return <>{children}</>;
  }

  // Écran de chargement pendant la vérification de session
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

