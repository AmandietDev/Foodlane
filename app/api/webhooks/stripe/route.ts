import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import {
  inferTierIntervalFromPriceId,
  isFounderPriceId,
  parseInterval,
  parseTier,
  resolveTierIntervalFromParts,
  type BillingInterval,
  type SubscriptionTier,
} from "../../../src/lib/stripeSubscriptionEnv";

/**
 * Webhook Stripe — abonnements Premium & Premium Plus
 *
 * Variables : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
 * Price IDs : STRIPE_PRICE_ID_PREMIUM_MENSUEL / _ANNUEL, STRIPE_PRICE_ID_PREMIUM_PLUS_MENSUEL / _ANNUEL
 */

function lineItemParts(subscription: Stripe.Subscription): {
  priceId: string | null;
  recurring: string | undefined;
} {
  const item = subscription.items?.data?.[0];
  return {
    priceId: item?.price?.id ?? null,
    recurring: item?.price?.recurring?.interval,
  };
}

function resolveTierIntervalForSubscription(subscription: Stripe.Subscription): {
  tier: SubscriptionTier | null;
  interval: BillingInterval | null;
} {
  const { priceId, recurring } = lineItemParts(subscription);
  return resolveTierIntervalFromParts(
    { tier: subscription.metadata?.tier, interval: subscription.metadata?.interval },
    priceId,
    recurring
  );
}

async function getUserIdFromSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  customerId: string
): Promise<string | null> {
  if (subscription.metadata?.userId) {
    return subscription.metadata.userId;
  }
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && typeof customer === "object" && customer.metadata?.userId) {
        return customer.metadata.userId;
      }
    } catch (err) {
      console.warn(`[StripeWebhook] Impossible de récupérer le customer ${customerId}:`, err);
    }
  }
  if (customerId && supabaseAdmin) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (profile?.id) return profile.id;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[Webhook Stripe] Signature manquante dans les en-têtes");
      return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      console.error(
        "[Webhook Stripe] Variables Stripe manquantes. Vérifiez STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET"
      );
      return NextResponse.json({ error: "Stripe non configuré" }, { status: 500 });
    }

    if (!supabaseAdmin) {
      console.error("[Webhook Stripe] Client Supabase admin non initialisé");
      return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey as string);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[Webhook Stripe] Erreur de signature:", err);
      return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
    }

    console.log(`[Webhook Stripe] Événement reçu: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || null;
        let tier = parseTier(session.metadata?.tier);
        let interval = parseInterval(session.metadata?.interval);

        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id || null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id || null;

        if (!userId) {
          console.error("[WEBHOOK] ❌ checkout.session.completed : metadata.userId manquant");
          break;
        }

        if (!subscriptionId) {
          console.error("[WEBHOOK] ❌ checkout.session.completed : subscription ID manquant");
          break;
        }

        let subscription: Stripe.Subscription;
        try {
          subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
        } catch (err) {
          console.error(`[WEBHOOK] ❌ Impossible de récupérer la subscription ${subscriptionId}:`, err);
          break;
        }

        if (!tier || !interval) {
          const resolved = resolveTierIntervalForSubscription(subscription);
          tier = tier || resolved.tier;
          interval = interval || resolved.interval;
        }

        if (!tier || !interval) {
          console.error(
            "[WEBHOOK] ❌ Impossible de déterminer tier/interval (metadata + price Stripe)"
          );
          break;
        }

        const premiumEndDate = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        const nowIso = new Date().toISOString();

        const { priceId: subPriceId } = lineItemParts(subscription);
        const founder = isFounderPriceId(subPriceId);

        const updateData: Record<string, unknown> = {
          premium_active: true,
          subscription_tier: tier,
          premium_plan: interval,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
          premium_started_at: nowIso,
          premium_start_date: nowIso,
          premium_end_date: premiumEndDate,
          current_period_end: premiumEndDate,
          premium_ended_at: null,
          cancel_at_period_end: false,
          subscription_cancelled_at: null,
          is_founder: founder,
          is_beta_tester: false,
          founder_offer_type: founder ? "launch" : null,
          stripe_price_id: subPriceId,
          billing_cycle: interval,
        };

        const { data, error } = await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("id", userId)
          .select();

        if (error) {
          console.error("[WEBHOOK] ❌ Erreur Supabase checkout.session.completed:", error);
        } else if (!data?.length) {
          console.error(
            `[WEBHOOK] ❌ Aucun profil trouvé pour userId=${userId} (checkout.session.completed)`
          );
        } else {
          console.log(
            `[WEBHOOK] ✅ Profil ${userId} activé — tier=${tier}, interval=${interval}, current_period_end=${premiumEndDate ?? "null"}`
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id || null;
        const subscriptionId = subscription.id;
        const status = subscription.status;

        if (event.type === "customer.subscription.updated") {
          console.log("[Webhook Stripe] customer.subscription.updated", {
            subscriptionId,
            status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end_unix: subscription.current_period_end,
          });
        }

        if (!customerId) {
          console.error("[WEBHOOK] ❌ customer.subscription.* : Customer ID manquant");
          break;
        }

        let full: Stripe.Subscription;
        try {
          full = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
        } catch (err) {
          console.error("[WEBHOOK] ❌ Erreur retrieve subscription:", err);
          break;
        }

        const userIdFromMeta = full.metadata?.userId || null;
        const userId =
          userIdFromMeta || (await getUserIdFromSubscription(stripe, full, customerId));
        let { tier, interval } = resolveTierIntervalForSubscription(full);
        if (!tier || !interval) {
          const priceId = lineItemParts(full).priceId;
          const inferred = inferTierIntervalFromPriceId(priceId);
          tier = tier || inferred.tier;
          interval = interval || inferred.interval;
        }

        const periodEndIso = full.current_period_end
          ? new Date(full.current_period_end * 1000).toISOString()
          : null;
        const canceledAtIso =
          full.canceled_at != null ? new Date(full.canceled_at * 1000).toISOString() : null;

        const endedByStripe = status === "canceled" || status === "incomplete_expired";

        let premiumActive = status === "active" || status === "trialing";
        const updateData: Record<string, unknown> = {
          subscription_status: status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          premium_end_date: periodEndIso,
          current_period_end: periodEndIso,
        };

        if (endedByStripe) {
          const nowIso = new Date().toISOString();
          premiumActive = false;
          updateData.premium_active = false;
          updateData.subscription_tier = "free";
          updateData.premium_plan = null;
          updateData.premium_ended_at = nowIso;
          updateData.premium_end_date = periodEndIso || nowIso;
          updateData.stripe_subscription_id = null;
          updateData.cancel_at_period_end = false;
          updateData.current_period_end = null;
          updateData.subscription_cancelled_at = canceledAtIso || nowIso;
          updateData.is_founder = false;
          updateData.stripe_price_id = null;
          updateData.founder_offer_type = null;
          updateData.billing_cycle = null;
        } else {
          updateData.premium_active = premiumActive;
          if (tier) updateData.subscription_tier = tier;
          if (interval) updateData.premium_plan = interval;
          updateData.cancel_at_period_end = Boolean(full.cancel_at_period_end);
          updateData.subscription_cancelled_at =
            full.cancel_at_period_end ? canceledAtIso : null;

          const { priceId: livePriceId } = lineItemParts(full);
          const founder = isFounderPriceId(livePriceId);
          updateData.is_founder = founder;
          updateData.founder_offer_type = founder ? "launch" : null;
          updateData.stripe_price_id = livePriceId;
          updateData.billing_cycle = interval ?? null;
          updateData.is_beta_tester = false;
        }

        const applyUpdate = async (
          column: "id" | "stripe_customer_id" | "stripe_subscription_id",
          value: string
        ) => {
          return supabaseAdmin!.from("profiles").update(updateData).eq(column, value).select();
        };

        const attempts: Array<["id" | "stripe_customer_id" | "stripe_subscription_id", string]> = [];
        if (subscriptionId) attempts.push(["stripe_subscription_id", subscriptionId]);
        if (userId) attempts.push(["id", userId]);
        if (customerId) attempts.push(["stripe_customer_id", customerId]);

        if (attempts.length === 0) {
          console.error("[WEBHOOK] ❌ Aucune clé pour cibler le profil (subscription.updated)");
          break;
        }

        let result = await applyUpdate(attempts[0][0], attempts[0][1]);
        for (let i = 1; i < attempts.length; i++) {
          if (result.data?.length && !result.error) break;
          const [col, val] = attempts[i];
          result = await applyUpdate(col, val);
        }

        if (result.error) {
          console.error("[WEBHOOK] ❌ Erreur customer.subscription.updated:", result.error);
        } else if (!result.data?.length) {
          console.error(
            `[WEBHOOK] ❌ Aucun profil pour subscription.updated (userId=${userId}, customer=${customerId}, sub=${subscriptionId})`
          );
        } else {
          console.log(
            `[WEBHOOK] ✅ ${event.type} — subscriptionId=${subscriptionId}, status=${status}, premium_active=${premiumActive}, cancel_at_period_end=${updateData.cancel_at_period_end}, current_period_end=${updateData.current_period_end}, profils=${result.data?.length}`
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const nowIso = new Date().toISOString();

        const updateData: Record<string, unknown> = {
          premium_active: false,
          subscription_status: "canceled",
          subscription_tier: "free",
          premium_plan: null,
          premium_ended_at: nowIso,
          premium_end_date: nowIso,
          stripe_subscription_id: null,
          cancel_at_period_end: false,
          current_period_end: null,
          subscription_cancelled_at: nowIso,
          is_founder: false,
          stripe_price_id: null,
          founder_offer_type: null,
          billing_cycle: null,
        };

        const { data, error } = await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("stripe_subscription_id", subscriptionId)
          .select();

        if (error) {
          console.error("[WEBHOOK] ❌ Erreur customer.subscription.deleted:", error);
        } else if (!data?.length) {
          console.error(
            `[WEBHOOK] ❌ Aucun profil pour stripe_subscription_id=${subscriptionId} (deleted)`
          );
        } else {
          console.log(`[WEBHOOK] ✅ Abonnement supprimé — subscriptionId=${subscriptionId}, profils=${data?.length}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id || null;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;

        if (!subscriptionId && !customerId) {
          console.warn("[WEBHOOK] ⚠️ invoice.payment_succeeded : pas de customer ni subscription");
          break;
        }

        let premiumEndDate: string | null = null;
        let tier: SubscriptionTier | null = null;
        let interval: BillingInterval | null = null;
        let cancelAtPeriodEnd = false;
        let subscriptionCancelledAt: string | null = null;
        let livePriceId: string | null = null;

        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ["items.data.price"],
            });
            const resolved = resolveTierIntervalForSubscription(sub);
            tier = resolved.tier;
            interval = resolved.interval;
            livePriceId = sub.items?.data?.[0]?.price?.id ?? null;
            premiumEndDate = sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null;
            cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
            subscriptionCancelledAt =
              sub.cancel_at_period_end && sub.canceled_at != null
                ? new Date(sub.canceled_at * 1000).toISOString()
                : null;
          } catch (err) {
            console.error("[WEBHOOK] ❌ invoice.payment_succeeded retrieve sub:", err);
            break;
          }
        }

        const updateData: Record<string, unknown> = {
          premium_active: true,
          subscription_status: "active",
        };
        if (subscriptionId) {
          updateData.premium_end_date = premiumEndDate;
          updateData.current_period_end = premiumEndDate;
          updateData.cancel_at_period_end = cancelAtPeriodEnd;
          updateData.subscription_cancelled_at = subscriptionCancelledAt;
          const founder = isFounderPriceId(livePriceId);
          updateData.stripe_price_id = livePriceId;
          updateData.is_founder = founder;
          updateData.founder_offer_type = founder ? "launch" : null;
          updateData.billing_cycle = interval;
          updateData.is_beta_tester = false;
        }
        if (tier) updateData.subscription_tier = tier;
        if (interval) updateData.premium_plan = interval;

        let rows = null;
        let err = null;
        if (customerId) {
          const r = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("stripe_customer_id", customerId)
            .select();
          rows = r.data;
          err = r.error;
        }
        if ((!rows || rows.length === 0) && subscriptionId) {
          const r = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("stripe_subscription_id", subscriptionId)
            .select();
          rows = r.data;
          err = r.error;
        }

        if (err) console.error("[WEBHOOK] ❌ invoice.payment_succeeded:", err);
        else if (!rows?.length) {
          console.warn(
            `[WEBHOOK] ⚠️ Aucun profil pour renouvellement (customer=${customerId}, sub=${subscriptionId})`
          );
        } else {
          console.log("[WEBHOOK] ✅ Renouvellement enregistré");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id || null;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;

        const updateData: Record<string, unknown> = {
          subscription_status: "past_due",
        };

        let rows = null;
        let err = null;
        if (customerId) {
          const r = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("stripe_customer_id", customerId)
            .select();
          rows = r.data;
          err = r.error;
        }
        if ((!rows || rows.length === 0) && subscriptionId) {
          const r = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("stripe_subscription_id", subscriptionId)
            .select();
          rows = r.data;
          err = r.error;
        }

        if (err) console.error("[WEBHOOK] ❌ invoice.payment_failed:", err);
        else if (!rows?.length) {
          console.warn(
            `[WEBHOOK] ⚠️ invoice.payment_failed : aucun profil (customer=${customerId}, sub=${subscriptionId})`
          );
        } else {
          console.log("[WEBHOOK] ⚠️ Paiement échoué — subscription_status=past_due (premium non coupé de force)");
        }
        break;
      }

      default:
        console.log(`[Webhook Stripe] Événement non géré: ${event.type}`);
    }

    return NextResponse.json({
      ok: true,
      message: "Webhook traité avec succès",
      event: event.type,
    });
  } catch (error) {
    console.error("[Webhook Stripe] Erreur lors du traitement:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du traitement du webhook",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
