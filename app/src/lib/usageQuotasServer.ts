import { supabaseAdmin } from "./supabaseAdmin";
import type { UserProfile } from "./profile";
import { hasPaidSubscriptionAccess } from "./profile";

const PROFILE_SELECT =
  "id, email, premium_active, premium_plan, subscription_tier, subscription_status, cancel_at_period_end, current_period_end, subscription_cancelled_at, premium_start_date, premium_end_date, premium_started_at, premium_ended_at, stripe_customer_id, stripe_subscription_id, is_beta_tester, full_name";

export type UsageMetric =
  | "menu_generation"
  | "slot_regeneration"
  | "recipes_for_me_ai"
  | "analyze_meal"
  | "grocery_export";

export async function fetchProfileForQuotas(userId: string): Promise<UserProfile | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const periodEndRaw =
    (typeof row.current_period_end === "string" && row.current_period_end) ||
    (data.premium_end_date as string | null) ||
    null;

  let premiumActive = Boolean(data.premium_active);
  const premiumEndDate = periodEndRaw ? new Date(periodEndRaw) : null;
  const now = new Date();

  if (premiumEndDate && premiumEndDate < now) {
    premiumActive = false;
  } else if (premiumEndDate && premiumEndDate >= now) {
    premiumActive = true;
  }
  const prenom =
    typeof data.full_name === "string" && data.full_name.length > 0
      ? data.full_name.split(" ")[0] || null
      : null;

  return {
    id: data.id as string,
    email: (data.email as string) || "",
    premium_active: premiumActive,
    premium_plan: (data.premium_plan as "monthly" | "yearly" | null) || null,
    subscription_tier: (row.subscription_tier as string | null | undefined) ?? null,
    subscription_status: (row.subscription_status as string | null | undefined) ?? null,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    current_period_end: (row.current_period_end as string | null | undefined) ?? null,
    subscription_cancelled_at: (row.subscription_cancelled_at as string | null | undefined) ?? null,
    premium_start_date: (data.premium_start_date as string | null) || null,
    premium_end_date: (data.premium_end_date as string | null) || null,
    premium_started_at: (row.premium_started_at as string | null | undefined) ?? null,
    premium_ended_at: (row.premium_ended_at as string | null | undefined) ?? null,
    stripe_customer_id: (data.stripe_customer_id as string | null) || null,
    stripe_subscription_id: (data.stripe_subscription_id as string | null) || null,
    is_beta_tester: Boolean(row.is_beta_tester),
    full_name: (data.full_name as string | null) || null,
    prenom,
  };
}

export function monthPeriodKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Lundi de la semaine locale, préfixé pour éviter collision avec les clés mensuelles. */
export function weekPeriodKey(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dayM = String(x.getDate()).padStart(2, "0");
  return `week:${y}-${m}-${dayM}`;
}

type RpcResult = { allowed?: boolean; count?: number; limit?: number };

/**
 * Pour un utilisateur sans accès payant : consomme une unité de quota si le plafond n'est pas atteint.
 * Accès payant : pas d'écriture compteur, toujours autorisé.
 */
export async function tryConsumeFreemiumQuota(
  userId: string,
  metric: UsageMetric,
  periodKey: string,
  limit: number
): Promise<{ allowed: boolean; count?: number; limit?: number }> {
  const profile = await fetchProfileForQuotas(userId);
  if (hasPaidSubscriptionAccess(profile)) {
    return { allowed: true };
  }

  if (!supabaseAdmin) {
    return { allowed: false, limit };
  }

  const { data, error } = await supabaseAdmin.rpc("try_increment_usage", {
    p_user_id: userId,
    p_period_key: periodKey,
    p_metric: metric,
    p_limit: limit,
  });

  if (error) {
    console.error("[usageQuotasServer] try_increment_usage", error);
    return { allowed: false, limit };
  }

  const row = data as RpcResult | null;
  const allowed = Boolean(row?.allowed);
  return {
    allowed,
    count: typeof row?.count === "number" ? row.count : undefined,
    limit: typeof row?.limit === "number" ? row.limit : limit,
  };
}
