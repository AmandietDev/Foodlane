import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { isBetaWhitelistedEmail } from "../../../src/lib/betaWhitelistServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Applique l’accès **Premium Plus bêta** si l’email de l’utilisateur est dans `FOODLANE_BETA_EMAILS`.
 * Ne remplace pas un abonnement Stripe actif (priorité au payant).
 *
 * Auth : Bearer JWT Supabase (même utilisateur que le profil cible).
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser(token);

    if (userErr || !user?.id || !user.email) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    if (!isBetaWhitelistedEmail(user.email)) {
      return NextResponse.json({ applied: false, reason: "not_whitelisted" });
    }

    const { data: profile, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_subscription_id, subscription_status, is_beta_tester")
      .eq("id", user.id)
      .maybeSingle();

    if (readErr) {
      console.error("[sync-beta-access] read:", readErr);
      return NextResponse.json({ error: "Lecture profil impossible" }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    const paidStripe =
      profile.stripe_subscription_id &&
      ["active", "trialing", "past_due"].includes(String(profile.subscription_status || ""));

    if (paidStripe) {
      return NextResponse.json({ applied: false, reason: "stripe_subscription_present" });
    }

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {
      premium_active: true,
      subscription_tier: "premium_plus",
      subscription_status: "active",
      is_beta_tester: true,
      is_founder: false,
      founder_offer_type: null,
      stripe_price_id: null,
      billing_cycle: null,
      premium_plan: null,
      cancel_at_period_end: false,
      subscription_cancelled_at: null,
    };
    if (!profile.is_beta_tester) {
      patch.premium_started_at = nowIso;
      patch.premium_start_date = nowIso.split("T")[0];
    }

    const { error: upErr } = await supabaseAdmin.from("profiles").update(patch).eq("id", user.id);

    if (upErr) {
      console.error("[sync-beta-access] update:", upErr);
      return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
    }

    return NextResponse.json({ applied: true });
  } catch (e) {
    console.error("[sync-beta-access]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
