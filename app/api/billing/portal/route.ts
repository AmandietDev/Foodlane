import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type PortalIntent = "default" | "cancel_subscription";
type ReturnTo = "menu" | "compte" | "premium";

/**
 * Crée une session Stripe Customer Portal.
 *
 * Body JSON :
 * - userId: string (obligatoire)
 * - intent?: "default" | "cancel_subscription" — avec cancel, ouvre le flux Stripe
 *   d’annulation d’abonnement puis redirige vers returnTo.
 * - returnTo?: "menu" | "compte" | "premium" — URL de retour après le portail (défaut : menu).
 */

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error("[Billing Portal] STRIPE_SECRET_KEY manquante");
      return NextResponse.json({ error: "Stripe non configuré" }, { status: 500 });
    }

    const body = (await request.json()) as {
      userId?: string;
      intent?: string;
      returnTo?: string;
    };
    const { userId } = body;
    const intent: PortalIntent =
      body.intent === "cancel_subscription" ? "cancel_subscription" : "default";
    const returnTo: ReturnTo =
      body.returnTo === "compte" || body.returnTo === "premium" ? body.returnTo : "menu";

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Billing Portal] Variables Supabase manquantes");
      return NextResponse.json({ error: "Configuration Supabase incomplète" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[Billing Portal] Erreur lors de la récupération du profil:", profileError);
      return NextResponse.json({ error: "Erreur lors de la récupération du profil" }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profil utilisateur non trouvé" }, { status: 404 });
    }

    const originBase =
      (process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000").replace(
        /\/$/,
        ""
      );

    const returnPath: Record<ReturnTo, string> = {
      menu: "/menu?stripe_portal_return=1&tab=abonnement",
      compte: "/compte?stripe_portal_return=1",
      premium: "/premium?stripe_portal_return=1",
    };
    const returnUrl = `${originBase}${returnPath[returnTo]}`;

    const stripe = new Stripe(stripeSecretKey);

    let stripeCustomerId = profile.stripe_customer_id as string | null;
    const stripeSubscriptionId = profile.stripe_subscription_id as string | null;

    if (!stripeCustomerId) {
      console.warn("[Billing Portal] stripe_customer_id manquant, tentative via email");
      const customers = await stripe.customers.list({
        email: profile.email || undefined,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return NextResponse.json(
          { error: "Aucun client Stripe trouvé. Assure-toi d’avoir souscrit à Premium." },
          { status: 404 }
        );
      }

      stripeCustomerId = customers.data[0].id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", userId);
    }

    if (intent === "cancel_subscription") {
      if (!stripeSubscriptionId) {
        return NextResponse.json(
          {
            error: "Abonnement Stripe introuvable pour ce compte.",
            details: "Réessaie depuis la page Premium ou contacte le support.",
          },
          { status: 400 }
        );
      }
    }

    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: stripeCustomerId,
      return_url: returnUrl,
      locale: "fr",
    };

    if (intent === "cancel_subscription" && stripeSubscriptionId) {
      sessionParams.flow_data = {
        type: "subscription_cancel",
        subscription_cancel: {
          subscription: stripeSubscriptionId,
        },
        after_completion: {
          type: "redirect",
          redirect: {
            return_url: returnUrl,
          },
        },
      };
    }

    console.log(
      `[Billing Portal] Session — customer=${stripeCustomerId}, intent=${intent}, return=${returnTo}`
    );

    const portalSession = await stripe.billingPortal.sessions.create(sessionParams);

    console.log(`[Billing Portal] ✅ Session créée: ${portalSession.id}`);

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error("[Billing Portal] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la création de la session de gestion d'abonnement",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
