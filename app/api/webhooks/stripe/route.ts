import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";

/**
 * Webhook Stripe pour gérer les événements d'abonnement Premium
 * 
 * Événements gérés :
 * - checkout.session.completed : Paiement réussi → activer premium
 * - customer.subscription.deleted : Abonnement supprimé → désactiver premium
 * - customer.subscription.canceled : Abonnement annulé → désactiver premium
 * - customer.subscription.unpaid : Abonnement impayé → désactiver premium
 * 
 * ⚠️ IMPORTANT : Ce webhook doit être configuré dans le dashboard Stripe
 * avec l'URL : https://TON-DOMAINE/api/webhooks/stripe
 */

export async function POST(request: NextRequest) {
  try {
    // Lire le body brut (important pour la vérification de signature)
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[Webhook Stripe] Signature manquante dans les en-têtes");
      return NextResponse.json(
        { error: "Signature manquante" },
        { status: 400 }
      );
    }

    // Vérifier les variables d'environnement
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      console.error(
        "[Webhook Stripe] Variables Stripe manquantes. Vérifiez STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET"
      );
      return NextResponse.json(
        { error: "Stripe non configuré" },
        { status: 500 }
      );
    }

    if (!supabaseAdmin) {
      console.error("[Webhook Stripe] Client Supabase admin non initialisé");
      return NextResponse.json(
        { error: "Supabase non configuré" },
        { status: 500 }
      );
    }

    // Initialiser Stripe (on laisse Stripe choisir la bonne version d'API)
        const stripe = new Stripe(stripeSecretKey as string);


    // Vérifier la signature du webhook
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[Webhook Stripe] Erreur de signature:", err);
      return NextResponse.json(
        { error: "Signature invalide" },
        { status: 400 }
      );
    }

    console.log(`[Webhook Stripe] Événement reçu: ${event.type}`);

    // Traiter les événements selon leur type
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Extraire l'email : priorité à customer_details, puis customer_email, puis metadata
        const email =
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.email ||
          null;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id || null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id || null;

        if (!email) {
          console.error(
            "[Webhook Stripe] ❌ Email manquant dans checkout.session.completed",
            {
              customer_details: session.customer_details?.email,
              customer_email: session.customer_email,
              metadata: session.metadata,
            }
          );
          break;
        }

        console.log(
          `[Webhook Stripe] 💳 Paiement réussi pour ${email} (customer: ${customerId}, subscription: ${subscriptionId})`
        );

        // Mettre à jour le profil dans Supabase via l'email
        const { data: updatedProfile, error } = await supabaseAdmin!
          .from("profiles")
          .update({
            premium_active: true,
            premium_start_date: new Date().toISOString(),
            premium_end_date: null,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq("email", email)
          .select();

        if (error) {
          console.error(
            "[Webhook Stripe] ❌ Erreur lors de l'activation du premium:",
            error
          );
        } else {
          if (updatedProfile && updatedProfile.length > 0) {
            console.log(
              `[Webhook Stripe] ✅ Premium activé pour ${email} (profil ID: ${updatedProfile[0].id})`
            );
          } else {
            console.warn(
              `[Webhook Stripe] ⚠️ Aucun profil trouvé avec l'email ${email}`
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.canceled":
      case "customer.subscription.unpaid": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id || null;
        const subscriptionId = subscription.id;

        if (!customerId) {
          console.error(
            `[Webhook Stripe] ❌ Customer ID manquant dans ${event.type}`
          );
          break;
        }

        console.log(
          `[Webhook Stripe] 🛑 Abonnement arrêté (${event.type}) pour customer: ${customerId}, subscription: ${subscriptionId}`
        );

        // Désactiver le premium dans Supabase via stripe_customer_id
        // On essaie d'abord avec customer_id, puis avec subscription_id si nécessaire
        let updatedProfile = null;
        let error = null;

        // Essayer avec customer_id d'abord
        if (customerId) {
          const result = await supabaseAdmin!
            .from("profiles")
            .update({
              premium_active: false,
              premium_end_date: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId)
            .select();
          updatedProfile = result.data;
          error = result.error;
        }

        // Si pas trouvé avec customer_id, essayer avec subscription_id
        if ((!updatedProfile || updatedProfile.length === 0) && subscriptionId) {
          const result = await supabaseAdmin!
            .from("profiles")
            .update({
              premium_active: false,
              premium_end_date: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId)
            .select();
          updatedProfile = result.data;
          error = result.error;
        }

        if (error) {
          console.error(
            `[Webhook Stripe] ❌ Erreur lors de la désactivation du premium:`,
            error
          );
        } else {
          if (updatedProfile && updatedProfile.length > 0) {
            console.log(
              `[Webhook Stripe] ❌ Premium désactivé pour ${updatedProfile.length} profil(s) (customer: ${customerId})`
            );
          } else {
            console.warn(
              `[Webhook Stripe] ⚠️ Aucun profil trouvé avec customer_id: ${customerId} ou subscription_id: ${subscriptionId}`
            );
          }
        }
        break;
      }

      default:
        console.log(
          `[Webhook Stripe] Événement non géré: ${event.type}`
        );
    }

    // Toujours retourner 200 pour confirmer la réception à Stripe
    return NextResponse.json({ received: true });
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

// Désactiver le body parsing par défaut de Next.js pour les webhooks
export const runtime = "nodejs";
