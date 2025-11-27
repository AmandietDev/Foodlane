"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isLoggedIn } from "../src/lib/userPreferences";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const loggedIn = isLoggedIn();
    setIsAuthenticated(loggedIn);
    
    // Pages qui ne nécessitent pas de connexion
    const publicPages = ["/compte"];
    
    // Si l'utilisateur n'est pas connecté et n'est pas sur une page publique, rediriger vers /compte
    if (!loggedIn && !publicPages.includes(pathname)) {
      router.replace("/compte");
    }
    
    setIsChecking(false);
  }, [router, pathname]);

  // Afficher un écran de chargement pendant la vérification
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D44A4A] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Chargement...</p>
        </div>
      </div>
    );
  }

  // Pages publiques : toujours afficher
  const publicPages = ["/compte"];
  if (publicPages.includes(pathname)) {
    return <>{children}</>;
  }

  // Pages protégées : n'afficher que si connecté
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D44A4A] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Redirection...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

