import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Limite configurable des places « fondateur » (abonnements payants au tarif lancement).
 * Variable : FOODLANE_FOUNDERS_LIMIT (défaut 100).
 */
export function getFoundersLimit(): number {
  const raw = process.env.FOODLANE_FOUNDERS_LIMIT;
  const n = raw ? parseInt(raw, 10) : 100;
  if (!Number.isFinite(n) || n < 1) return 100;
  return Math.min(n, 1_000_000);
}

function normalizeRpcCount(data: unknown): number | null {
  if (data == null) return null;
  if (typeof data === "number" && Number.isFinite(data)) return Math.trunc(data);
  if (typeof data === "string") {
    const n = parseInt(data, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function logFoundersCountError(context: string, err: unknown) {
  const e = err as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  console.error(`[foundersQuota] ${context}:`, {
    message: e?.message,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
  });
}

/**
 * Compte les fondateurs actifs payants (Stripe), hors bêta testeurs gratuits.
 * Préfère la RPC SQL (migration 026) ; repli HTTP si la RPC n’est pas encore déployée.
 */
export async function countActiveFoundingSubscribers(
  admin: SupabaseClient
): Promise<number> {
  const rpc = await admin.rpc("count_active_founding_subscribers");
  const fromRpc = normalizeRpcCount(rpc.data);
  if (!rpc.error && fromRpc != null) {
    return fromRpc;
  }

  if (rpc.error) {
    const code = (rpc.error as { code?: string }).code;
    const msg = (rpc.error as { message?: string }).message ?? "";
    const missingFn =
      code === "PGRST202" ||
      code === "42883" ||
      /function .* does not exist/i.test(msg) ||
      /schema cache/i.test(msg);
    if (!missingFn) {
      logFoundersCountError("rpc count_active_founding_subscribers", rpc.error);
    }
  }

  const { count, error } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_founder", true)
    .eq("is_beta_tester", false)
    .not("stripe_subscription_id", "is", null)
    .or("subscription_status.eq.active,subscription_status.eq.trialing");

  if (error) {
    logFoundersCountError("fallback select count", error);
    return 0;
  }
  return count ?? 0;
}
