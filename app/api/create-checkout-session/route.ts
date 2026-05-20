import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import {
  parseInterval,
  parseTier,
  resolveCheckoutPriceId,
} from "../../src/lib/stripeSubscriptionEnv";
import { supabaseAdmin } from "../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../src/lib/supabaseServer";
import {
  countActiveFoundingSubscribers,
  getFoundersLimit,
} from "../../src/lib/foundersQuota";

/** Cookie Refgrow (dernier clic) — `cookies()` ou en-tête brut en secours. */
async function getRefgrowRefCodeFromRequest(request: NextRequest): Promise<string | undefined> {
  const cookieStore = await cookies();
  const fromNext = cookieStore.get("refgrow_ref_code")?.value?.trim();
  if (fromNext) return fromNext;
  const raw = request.headers.get("cookie");
  if (!raw) return undefined;
  const m = raw.match(/(?:^|;\s*)refgrow_ref_code=([^;]+)/i);
  if (!m?.[1]) return undefined;
  try {
    return decodeURIComponent(m[1]).trim();
  } catch {
    return m[1].trim();
  }
}

/**
 * Crée une session Stripe Checkout (abonnement).
 *
 * Body JSON :
 * - userId: string
 * - email: string
 * - tier: "premium" | "premium_plus"
 * - interval: "monthly" | "yearly"
 *
 * Le prix **fondateur** est choisi côté serveur tant qu’il reste des places
 * (`FOODLANE_FOUNDERS_LIMIT` − comptage actif). Sinon prix standard.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, tier: tierRaw, interval: intervalRaw } = body as {
      userId?: string;
      email?: string;
      tier?: string;
      interval?: string;
    };

    if (!userId || !email) {
      console.error("[Checkout] Paramètres manquants:", { userId: !!userId, email: !!email });
      return NextResponse.json({ error: "userId et email requis" }, { status: 400 });
    }

    const authUserId = await getUserIdFromRequest(request);
    if (!authUserId || authUserId !== userId) {
      return NextResponse.json(
        { error: "Non authentifié ou compte incohérent. Reconnecte-toi puis réessaie." },
        { status: 401 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error("[Checkout] Email invalide:", email);
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const tier = parseTier(tierRaw);
    const interval = parseInterval(intervalRaw);

    if (!tier) {
      return NextResponse.json(
        { error: "Paramètre tier invalide.", details: 'Attendu : "premium" ou "premium_plus".' },
        { status: 400 }
      );
    }
    if (!interval) {
      return NextResponse.json(
        { error: "Paramètre interval invalide.", details: 'Attendu : "monthly" ou "yearly".' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error("[Checkout] STRIPE_SECRET_KEY manquante");
      return NextResponse.json(
        { error: "Stripe non configuré. Vérifiez STRIPE_SECRET_KEY dans .env.local" },
        { status: 500 }
      );
    }

    let foundersSlotsRemaining = 0;
    if (supabaseAdmin) {
      const used = await countActiveFoundingSubscribers(supabaseAdmin);
      const limit = getFoundersLimit();
      foundersSlotsRemaining = Math.max(0, limit - used);
    }

    const { priceId, kind, missingEnvKey } = resolveCheckoutPriceId(
      tier,
      interval,
      foundersSlotsRemaining
    );

    if (!priceId) {
      console.error(`[Checkout] ${missingEnvKey} manquante`);
      return NextResponse.json(
        {
          error: `Configuration Stripe incomplète : ${missingEnvKey} manquant.`,
          details: `Ajoute ${missingEnvKey} dans .env.local (Price ID Stripe pour ${tier} / ${interval}).`,
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const refgrowRefCode = (await getRefgrowRefCodeFromRequest(request)) || undefined;

    const meta = {
      userId,
      email,
      tier,
      interval,
      price_kind: kind,
      ...(refgrowRefCode
        ? { referral_code: refgrowRefCode.slice(0, 500) }
        : {}),
    };

    if (refgrowRefCode) {
      console.log(
        `[Checkout] Refgrow: referral_code + client_reference_id (len=${refgrowRefCode.length}) pour attribution Stripe → Refgrow`
      );
    } else {
      console.warn(
        "[Checkout] Refgrow: aucun cookie refgrow_ref_code — les ventes ne seront pas attribuées à un parrain (vérifier ?ref= sur le même site + webhooks Stripe vers Refgrow)."
      );
    }

    console.log(
      `[Checkout] Session pour ${email} — tier=${tier}, interval=${interval}, priceId=${priceId}, kind=${kind}, founderSlots=${foundersSlotsRemaining}`
    );

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      /** Refgrow lit aussi client_reference_id (priorité après metadata session). */
      ...(refgrowRefCode ? { client_reference_id: refgrowRefCode.slice(0, 200) } : {}),
      /** Champ « Ajouter un code promo » sur la page Checkout (coupons Stripe). */
      allow_promotion_codes: true,
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/premium?canceled=1`,
      metadata: meta,
      subscription_data: {
        metadata: meta,
      },
    });

    console.log(`[Checkout] ✅ Session créée: ${session.id} pour ${email}`);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      priceKind: kind,
    });
  } catch (error) {
    console.error("[Checkout] Erreur lors de la création de la session Stripe:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la création de la session de paiement",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
