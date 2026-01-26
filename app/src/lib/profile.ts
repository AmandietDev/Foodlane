/**
 * Fonctions pour récupérer et gérer le profil utilisateur depuis Supabase
 * Source de vérité pour premium_active
 */

import { supabase } from "./supabaseClient";

export interface UserProfile {
  id: string;
  email: string;
  premium_active: boolean;
  premium_plan: "monthly" | "yearly" | null;
  premium_start_date: string | null;
  premium_end_date: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  full_name: string | null;
  prenom: string | null;
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
        "id, email, premium_active, premium_plan, premium_start_date, premium_end_date, stripe_customer_id, stripe_subscription_id, full_name"
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

    // Vérifier si premium_end_date est passée et mettre à jour premium_active si nécessaire
    let premiumActive = data.premium_active || false;
    const premiumEndDate = data.premium_end_date ? new Date(data.premium_end_date) : null;
    const now = new Date();
    
    // Si premium_end_date est passée, l'utilisateur n'a plus accès
    if (premiumEndDate && premiumEndDate < now) {
      premiumActive = false;
    }
    // Si premium_end_date n'est pas encore passée, l'utilisateur a encore accès même si premium_active est false
    // (période payée en cours)
    else if (premiumEndDate && premiumEndDate >= now) {
      premiumActive = true;
    }

    return {
      id: data.id,
      email: data.email || "",
      premium_active: premiumActive,
      premium_plan: (data.premium_plan as "monthly" | "yearly" | null) || null,
      premium_start_date: data.premium_start_date || null,
      premium_end_date: data.premium_end_date || null,
      stripe_customer_id: data.stripe_customer_id || null,
      stripe_subscription_id: data.stripe_subscription_id || null,
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

