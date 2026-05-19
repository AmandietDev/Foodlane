import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * Programme la résiliation de l’abonnement en fin de période de facturation
 * (Stripe : cancel_at_period_end = true). L’accès reste actif jusqu’à cette date.
 *
 * Body : { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe non configuré" }, { status: 500 });
    }

    const { userId } = (await request.json()) as { userId?: string };
    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Configuration Supabase incomplète" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_subscription_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[CancelSub] Profil:", profileError);
      return NextResponse.json({ error: "Erreur lors de la lecture du profil" }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    const subscriptionId = profile.stripe_subscription_id as string | null;
    if (!subscriptionId) {
      return NextResponse.json(
        {
          error: "Aucun abonnement Stripe lié à ce compte.",
        },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    let sub: Stripe.Subscription;
    try {
      sub = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (e) {
      console.error("[CancelSub] retrieve:", e);
      return NextResponse.json({ error: "Impossible de lire l’abonnement Stripe." }, { status: 502 });
    }

    if (!["active", "trialing"].includes(sub.status)) {
      return NextResponse.json(
        {
          error: "Cet abonnement ne peut pas être résilié depuis l’app.",
          details: `Statut Stripe : ${sub.status}`,
        },
        { status: 400 }
      );
    }

    if (sub.cancel_at_period_end) {
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
      await supabaseAdmin
        .from("profiles")
        .update({
          cancel_at_period_end: true,
          current_period_end: periodEnd,
          premium_end_date: periodEnd,
          subscription_status: sub.status,
          subscription_cancelled_at:
            sub.canceled_at != null ? new Date(sub.canceled_at * 1000).toISOString() : null,
        })
        .eq("id", userId);
      return NextResponse.json({
        ok: true,
        alreadyScheduled: true,
        currentPeriodEnd: sub.current_period_end,
      });
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    const premiumEndDate = updated.current_period_end
      ? new Date(updated.current_period_end * 1000).toISOString()
      : null;

    await supabaseAdmin
      .from("profiles")
      .update({
        cancel_at_period_end: true,
        current_period_end: premiumEndDate,
        premium_end_date: premiumEndDate,
        subscription_status: updated.status,
        subscription_cancelled_at:
          updated.canceled_at != null
            ? new Date(updated.canceled_at * 1000).toISOString()
            : null,
      })
      .eq("id", userId);

    return NextResponse.json({
      ok: true,
      currentPeriodEnd: updated.current_period_end,
    });
  } catch (error) {
    console.error("[CancelSub] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la résiliation",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
