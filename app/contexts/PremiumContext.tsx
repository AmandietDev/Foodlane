"use client";

/**
 * Contexte React pour gérer l'état Premium global
 * Source de vérité pour isPremium dans toute l'application
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { getProfile, type UserProfile } from "../src/lib/profile";
import { loadPreferences, savePreferences } from "../src/lib/userPreferences";

interface PremiumContextType {
  isPremium: boolean;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const userProfile = await getProfile(user.id);
      setProfile(userProfile);

      // Synchroniser avec localStorage pour compatibilité
      if (userProfile) {
        const preferences = loadPreferences();
        const newAbonnementType = userProfile.premium_active ? "premium" : "free";
        
        // Mettre à jour seulement si différent pour éviter des boucles
        if (preferences.abonnementType !== newAbonnementType) {
          savePreferences({
            ...preferences,
            abonnementType: newAbonnementType,
            premiumStartDate: userProfile.premium_start_date || undefined,
            premiumExpirationDate: userProfile.premium_end_date || undefined,
          });
        }
      }
    } catch (error) {
      console.error("[PremiumProvider] Erreur lors du rafraîchissement:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      refreshProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user, refreshProfile]);

  // Calculer isPremium en tenant compte de premium_active ET premium_end_date
  // L'utilisateur a accès si premium_active est true OU si premium_end_date n'est pas encore passée
  const calculateIsPremium = (): boolean => {
    // Mode développement : permet de forcer l'UI premium localement
    if (process.env.NEXT_PUBLIC_FORCE_PREMIUM === "true") {
      return true;
    }

    if (!profile) return false;
    
    // Si premium_active est true, l'utilisateur a accès
    if (profile.premium_active) {
      // Vérifier aussi si premium_end_date n'est pas passée
      if (profile.premium_end_date) {
        const endDate = new Date(profile.premium_end_date);
        const now = new Date();
        // Si la date de fin est passée, l'utilisateur n'a plus accès
        if (endDate < now) {
          return false;
        }
      }
      return true;
    }
    
    // Si premium_active est false mais premium_end_date n'est pas encore passée,
    // l'utilisateur a encore accès (période payée en cours)
    if (profile.premium_end_date) {
      const endDate = new Date(profile.premium_end_date);
      const now = new Date();
      if (endDate >= now) {
        return true;
      }
    }
    
    return false;
  };

  const isPremium = calculateIsPremium();

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        profile,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextType {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
}

