/**
 * Helper pour protéger les routes API côté serveur
 * Vérifie que l'utilisateur est Premium avant d'autoriser l'accès
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { UserProfile } from "./profile";
import { hasPaidSubscriptionAccess } from "./profile";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Vérifie si un utilisateur est Premium
 * @param profile Profil utilisateur
 * @returns true si Premium, false sinon
 */
export function isPremium(profile: UserProfile | null): boolean {
  return hasPaidSubscriptionAccess(profile);
}

/**
 * Récupère le profil utilisateur depuis Supabase (côté serveur)
 * @param userId ID de l'utilisateur
 * @returns Profil ou null
 */
async function getProfileServer(userId: string): Promise<UserProfile | null> {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, email, premium_active, premium_plan, subscription_tier, subscription_status, cancel_at_period_end, current_period_end, subscription_cancelled_at, premium_start_date, premium_end_date, premium_started_at, premium_ended_at, stripe_customer_id, stripe_subscription_id, is_founder, is_beta_tester, billing_cycle, stripe_price_id, full_name"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Extraire le prénom
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
      full_name: data.full_name || null,
      prenom,
      is_founder: Boolean(row.is_founder),
      is_beta_tester: Boolean(row.is_beta_tester),
      billing_cycle: (row.billing_cycle as string | null | undefined) ?? null,
      stripe_price_id: (row.stripe_price_id as string | null | undefined) ?? null,
    };
  } catch (error) {
    console.error("[premiumGuard] Erreur récupération profil:", error);
    return null;
  }
}

/**
 * Récupère l'utilisateur depuis la session Supabase (côté serveur)
 * @param request Requête Next.js
 * @returns User ou null
 */
async function getUserFromRequest(request: NextRequest): Promise<{ id: string; email?: string } | null> {
  try {
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get("authorization");
    const cookieHeader = request.headers.get("cookie");

    if (!authHeader && !cookieHeader) {
      return null;
    }

    // Créer un client Supabase pour vérifier la session
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Si on a un token dans l'Authorization header
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return null;
      return { id: user.id, email: user.email };
    }

    // Sinon, essayer de récupérer depuis les cookies (nécessite une approche différente)
    // Pour l'instant, on va utiliser une approche plus simple : passer userId dans le body
    return null;
  } catch (error) {
    console.error("[premiumGuard] Erreur récupération utilisateur:", error);
    return null;
  }
}

/**
 * Guard pour protéger une route API Premium
 * Utilisation : const { userId, profile } = await requirePremium(request);
 * 
 * @param request Requête Next.js
 * @param userIdOptionnel Si fourni, utiliser cet userId au lieu de le récupérer depuis la session
 * @returns { userId, profile } ou throw NextResponse 403
 */
export async function requirePremium(
  request: NextRequest,
  userIdOptionnel?: string
): Promise<{ userId: string; profile: UserProfile }> {
  let userId: string | null = null;

  // Si userId est fourni (depuis le body), l'utiliser
  if (userIdOptionnel) {
    userId = userIdOptionnel;
  } else {
    // Sinon, essayer de le récupérer depuis la session
    const user = await getUserFromRequest(request);
    if (!user) {
      throw NextResponse.json(
        { error: "Non autorisé. Connexion requise." },
        { status: 401 }
      );
    }
    userId = user.id;
  }

  if (!userId) {
    throw NextResponse.json(
      { error: "Non autorisé. Connexion requise." },
      { status: 401 }
    );
  }

  // Récupérer le profil
  const profile = await getProfileServer(userId);

  if (!profile) {
    throw NextResponse.json(
      { error: "Profil utilisateur non trouvé." },
      { status: 404 }
    );
  }

  // Vérifier si Premium
  if (!isPremium(profile)) {
    throw NextResponse.json(
      { 
        error: "premium_required",
        message: "Cette fonctionnalité nécessite un abonnement Premium." 
      },
      { status: 403 }
    );
  }

  return { userId, profile };
}

/**
 * Comme `requirePremium`, mais réservé au palier **Premium Plus** (ex. analyse photo).
 */
export async function requirePremiumPlus(
  request: NextRequest,
  userIdOptionnel?: string
): Promise<{ userId: string; profile: UserProfile }> {
  const base = await requirePremium(request, userIdOptionnel);
  if (base.profile.subscription_tier !== "premium_plus") {
    throw NextResponse.json(
      {
        error: "premium_plus_required",
        message:
          "L’analyse photo est réservée à l’offre Premium Plus. Passe à Premium Plus pour débloquer.",
      },
      { status: 403 }
    );
  }
  return base;
}

