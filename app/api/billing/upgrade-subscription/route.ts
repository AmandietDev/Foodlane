import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  envKeyForStripePrice,
  inferTierIntervalFromPriceId,
  isFounderPriceId,
  parseInterval,
  resolveTierIntervalFromParts,
  stripePriceIdFor,
  type BillingInterval,
  type PriceKind,
} from "../../../src/lib/stripeSubscriptionEnv";

/**
 * Passe un abonnement Stripe existant de Premium → Premium Plus
 * (même rythme de facturation que l’offre actuelle : mensuel / annuel).
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
      .select(
        "id, subscription_tier, premium_plan, stripe_subscription_id, subscription_status, is_founder, stripe_price_id"
      )
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[Upgrade] Profil:", profileError);
      return NextResponse.json({ error: "Erreur lors de la lecture du profil" }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    if (profile.subscription_tier === "premium_plus") {
      return NextResponse.json(
        { error: "Tu es déjà abonné à Premium Plus." },
        { status: 400 }
      );
    }

    const subscriptionId = profile.stripe_subscription_id as string | null;
    if (!subscriptionId) {
      return NextResponse.json(
        {
          error: "Aucun abonnement Stripe lié à ce compte.",
          details: "Utilise la page Premium pour souscrire.",
        },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    let full: Stripe.Subscription;
    try {
      full = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });
    } catch (e) {
      console.error("[Upgrade] retrieve subscription:", e);
      return NextResponse.json(
        { error: "Impossible de lire l’abonnement Stripe." },
        { status: 502 }
      );
    }

    if (!["active", "trialing"].includes(full.status)) {
      return NextResponse.json(
        {
          error: "L’abonnement ne peut pas être modifié dans son état actuel.",
          details: `Statut Stripe : ${full.status}`,
        },
        { status: 400 }
      );
    }

    const item = full.items?.data?.[0];
    if (!item?.id) {
      return NextResponse.json(
        { error: "Abonnement Stripe sans article de facturation." },
        { status: 400 }
      );
    }

    const priceId = item.price?.id ?? null;
    const recurring = item.price?.recurring?.interval;
    let { tier: stripeTier, interval } = resolveTierIntervalFromParts(
      { tier: full.metadata?.tier, interval: full.metadata?.interval },
      priceId,
      recurring
    );
    if (!stripeTier || !interval) {
      const inferred = inferTierIntervalFromPriceId(priceId);
      stripeTier = stripeTier || inferred.tier;
      interval = (interval || inferred.interval) as BillingInterval | null;
    }

    const fromProfilePlan = parseInterval(profile.premium_plan as string | null);
    if (!interval && fromProfilePlan) interval = fromProfilePlan;

    if (stripeTier !== "premium") {
      return NextResponse.json(
        {
          error: "Le passage à Premium Plus en un clic est réservé aux abonnements Premium.",
          details:
            stripeTier === null
              ? "Palier Stripe non reconnu (vérifie les Price IDs dans .env)."
              : undefined,
        },
        { status: 400 }
      );
    }

    if (!interval) {
      return NextResponse.json(
        { error: "Impossible de déterminer la facturation (mensuel / annuel)." },
        { status: 400 }
      );
    }

    const newKind: PriceKind =
      Boolean(profile.is_founder) || isFounderPriceId(profile.stripe_price_id as string | null)
        ? "founder"
        : "standard";

    const newPriceId = stripePriceIdFor("premium_plus", interval, newKind);
    if (!newPriceId) {
      const missing = envKeyForStripePrice("premium_plus", interval, newKind);
      return NextResponse.json(
        {
          error: "Configuration Stripe incomplète.",
          details: `Variable manquante : ${missing}`,
        },
        { status: 500 }
      );
    }

    const meta = {
      ...(typeof full.metadata === "object" && full.metadata !== null ? full.metadata : {}),
      userId,
      tier: "premium_plus",
      interval,
    } as Stripe.MetadataParam;

    await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: item.id, price: newPriceId }],
      proration_behavior: "create_prorations",
      metadata: meta,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Upgrade] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du changement d’offre",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
