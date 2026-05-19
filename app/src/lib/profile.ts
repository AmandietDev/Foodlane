/**
 * Fonctions pour récupérer et gérer le profil utilisateur depuis Supabase
 * Source de vérité pour premium_active
 */

import { supabase } from "./supabaseClient";

export interface UserProfile {
  id: string;
  email: string;
  premium_active: boolean;
  /** Intervalle de facturation Stripe : monthly | yearly */
  premium_plan: "monthly" | "yearly" | null;
  /** Palier produit : premium | premium_plus | free | null */
  subscription_tier: string | null;
  subscription_status: string | null;
  /** Stripe `cancel_at_period_end` — résiliation en fin de période, accès jusqu’à `current_period_end`. */
  cancel_at_period_end: boolean;
  /** Fin de période de facturation Stripe (`current_period_end`), ISO. */
  current_period_end: string | null;
  /** Horodatage d’annulation côté Stripe (`canceled_at`) ou fin enregistrée au `subscription.deleted`. */
  subscription_cancelled_at: string | null;
  premium_start_date: string | null;
  premium_end_date: string | null;
  premium_started_at: string | null;
  premium_ended_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  /** true = tarif lancement Stripe (à vie sur ce Price ID tant que l’abonnement reste actif). */
  is_founder?: boolean;
  /** true = accès Premium Plus via whitelist bêta (sans Stripe). */
  is_beta_tester?: boolean;
  /** monthly | yearly — copie lisible du cycle Stripe */
  billing_cycle?: string | null;
  /** Dernier Price ID Stripe de l’article d’abonnement */
  stripe_price_id?: string | null;
  full_name: string | null;
  prenom: string | null;
}

export function hasPaidSubscriptionAccess(profile: UserProfile | null): boolean {
  if (!profile) return false;

  if (
    profile.is_beta_tester &&
    profile.subscription_tier === "premium_plus" &&
    profile.subscription_status === "active"
  ) {
    return true;
  }

  const periodEndIso = profile.current_period_end || profile.premium_end_date;

  if (profile.premium_active) {
    if (periodEndIso) {
      const end = new Date(periodEndIso);
      if (end < new Date()) return false;
    }
    return true;
  }

  if (periodEndIso) {
    const end = new Date(periodEndIso);
    return end >= new Date();
  }

  return false;
}

/**
 * Libellé localStorage / UI : free, premium ou premium_plus (aligné sur subscription_tier Supabase).
 */
export function abonnementTypeFromProfile(
  profile: UserProfile | null,
  paidAccess: boolean
): "free" | "premium" | "premium_plus" {
  if (!paidAccess || !profile) return "free";
  if (profile.subscription_tier === "premium_plus") return "premium_plus";
  return "premium";
}

/**
 * Récupère le profil utilisateur depuis Supabase
 * @param userId ID de l'utilisateur Supabase
 * @returns Profil utilisateur ou null si non trouvé
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, premium_active, premium_plan, subscription_tier, subscription_status, cancel_at_period_end, current_period_end, subscription_cancelled_at, premium_start_date, premium_end_date, premium_started_at, premium_ended_at, stripe_customer_id, stripe_subscription_id, is_founder, is_beta_tester, billing_cycle, stripe_price_id, full_name"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      // PGRST116 = pas de ligne trouvée (normal si le profil n'existe pas encore)
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("[getProfile] Erreur Supabase:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Extraire le prénom du full_name
    const prenom = data.full_name?.split(" ")[0] || null;

    const row = data as Record<string, unknown>;
    const periodEndRaw =
      (typeof row.current_period_end === "string" && row.current_period_end) ||
      data.premium_end_date ||
      null;

    let premiumActive = data.premium_active || false;
    const premiumEndDate = periodEndRaw ? new Date(periodEndRaw) : null;
    const now = new Date();

    const isBeta = Boolean(row.is_beta_tester) && row.subscription_status === "active";

    if (isBeta) {
      premiumActive = true;
    } else if (premiumEndDate && premiumEndDate < now) {
      premiumActive = false;
    } else if (premiumEndDate && premiumEndDate >= now) {
      premiumActive = true;
    }

    return {
      id: data.id,
      email: data.email || "",
      premium_active: premiumActive,
      premium_plan: (data.premium_plan as "monthly" | "yearly" | null) || null,
      subscription_tier: (row.subscription_tier as string | null | undefined) ?? null,
      subscription_status: (row.subscription_status as string | null | undefined) ?? null,
      cancel_at_period_end: Boolean(row.cancel_at_period_end),
      current_period_end: (row.current_period_end as string | null | undefined) ?? null,
      subscription_cancelled_at: (row.subscription_cancelled_at as string | null | undefined) ?? null,
      premium_start_date: data.premium_start_date || null,
      premium_end_date: data.premium_end_date || null,
      premium_started_at: (row.premium_started_at as string | null | undefined) ?? null,
      premium_ended_at: (row.premium_ended_at as string | null | undefined) ?? null,
      stripe_customer_id: data.stripe_customer_id || null,
      stripe_subscription_id: data.stripe_subscription_id || null,
      is_founder: Boolean(row.is_founder),
      is_beta_tester: Boolean(row.is_beta_tester),
      billing_cycle: (row.billing_cycle as string | null | undefined) ?? null,
      stripe_price_id: (row.stripe_price_id as string | null | undefined) ?? null,
      full_name: data.full_name || null,
      prenom,
    };
  } catch (error) {
    console.error("[getProfile] Erreur:", error);
    return null;
  }
}

/**
 * Récupère le profil de l'utilisateur actuellement connecté
 * @returns Profil utilisateur ou null si non connecté
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }

    return await getProfile(session.user.id);
  } catch (error) {
    console.error("[getCurrentUserProfile] Erreur:", error);
    return null;
  }
}

