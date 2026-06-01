"use client";

/**
 * Contexte React pour gérer l'état Premium global
 * Source de vérité pour isPremium dans toute l'application
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { getProfile, type UserProfile, hasPaidSubscriptionAccess, abonnementTypeFromProfile } from "../src/lib/profile";
import { loadPreferences, savePreferences } from "../src/lib/userPreferences";
import { supabase, isSupabaseConfigured } from "../src/lib/supabaseClient";
import { emitSubscriptionStateChanged } from "../src/lib/subscriptionSyncEvents";

export type SubscriptionDisplayTier = "free" | "premium" | "premium_plus";

interface PremiumContextType {
  isPremium: boolean;
  /** Abonnement actif au palier Premium Plus (photo repas, etc.). */
  isPremiumPlus: boolean;
  /** Palier affiché / localStorage (free, premium, premium_plus) — dérivé du profil Supabase. */
  subscriptionTier: SubscriptionDisplayTier;
  /**
   * Déverrouille l’assistant diététique (/equilibre) sans abonnement.
   * À activer uniquement en local via `.env.local` : NEXT_PUBLIC_DIET_ASSISTANT_DEV_ACCESS=true
   */
  dietAssistantDevAccess: boolean;
  /** Accès à la page assistant : Premium payant OU flag dev ci-dessus. */
  canAccessDietAssistant: boolean;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  /** Statut Stripe brut (active, canceled, past_due, …) si connu. */
  subscriptionStatus: string | null;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const paidAccess = hasPaidSubscriptionAccess(userProfile);
        const newAbonnementType = abonnementTypeFromProfile(userProfile, paidAccess);

        const shouldSync =
          preferences.abonnementType !== newAbonnementType ||
          (paidAccess &&
            (preferences.premiumExpirationDate !==
              (userProfile.current_period_end || userProfile.premium_end_date || undefined) ||
              preferences.premiumStartDate !== (userProfile.premium_start_date || undefined)));

        if (shouldSync) {
          savePreferences({
            ...preferences,
            abonnementType: newAbonnementType,
            premiumStartDate: paidAccess ? userProfile.premium_start_date || undefined : undefined,
            premiumExpirationDate: paidAccess
              ? userProfile.current_period_end || userProfile.premium_end_date || undefined
              : undefined,
          });
        }
      }

      emitSubscriptionStateChanged();
    } catch (error) {
      console.error("[PremiumProvider] Erreur lors du rafraîchissement:", error);
    } finally {
      setLoading(false);
    }

    // Bêta Stripe : en arrière-plan pour ne pas bloquer l’affichage des pages
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const r = await fetch("/api/billing/sync-beta-access", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (r.ok) {
          const j = (await r.json().catch(() => ({}))) as { applied?: boolean };
          if (j.applied) {
            const updated = await getProfile(user.id);
            if (updated) setProfile(updated);
          }
        }
      } catch (e) {
        console.warn("[PremiumProvider] sync-beta-access:", e);
      }
    })();
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

  /** Mise à jour quasi temps réel quand Supabase notifie un changement sur `profiles`. */
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`profiles-subscription-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          void refreshProfile();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, refreshProfile]);

  /** Retour sur l’app / onglet (ex. après portail Stripe) : recharger le profil. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible" || !user) return;
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = setTimeout(() => {
        visibilityTimerRef.current = null;
        void refreshProfile();
      }, 800);
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
    };
  }, [user, refreshProfile]);

  // Calculer isPremium en tenant compte de premium_active ET premium_end_date
  // L'utilisateur a accès si premium_active est true OU si premium_end_date n'est pas encore passée
  const calculateIsPremium = (): boolean => {
    if (process.env.NEXT_PUBLIC_FORCE_PREMIUM === "true") {
      return true;
    }
    return hasPaidSubscriptionAccess(profile);
  };

  const isPremium = calculateIsPremium();

  const subscriptionTier: SubscriptionDisplayTier = useMemo(() => {
    if (!profile) return "free";
    return abonnementTypeFromProfile(profile, hasPaidSubscriptionAccess(profile));
  }, [profile]);

  const subscriptionStatus = profile?.subscription_status ?? null;

  const dietAssistantDevAccess =
    process.env.NEXT_PUBLIC_DIET_ASSISTANT_DEV_ACCESS === "true";

  const canAccessDietAssistant = isPremium || dietAssistantDevAccess;

  const isPremiumPlus =
    isPremium && profile?.subscription_tier === "premium_plus";

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isPremiumPlus,
        subscriptionTier,
        dietAssistantDevAccess,
        canAccessDietAssistant,
        profile,
        loading,
        refreshProfile,
        subscriptionStatus,
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

