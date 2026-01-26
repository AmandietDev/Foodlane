import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";

/**
 * Webhook Stripe pour gérer les événements d'abonnement Premium
 *
 * Événements gérés :
 * - checkout.session.completed : Premier paiement réussi → activer premium
 * - invoice.payment_succeeded : Renouvellement mensuel réussi → mettre à jour premium_end_date
 * - invoice.payment_failed : Échec de paiement lors du renouvellement → log (gestion optionnelle)
 * - customer.subscription.deleted : Abonnement supprimé → désactiver premium
 * - customer.subscription.updated : Changement d'abonnement → vérifier le status et désactiver si nécessaire
 *
 * ⚠️ IMPORTANT : Ce webhook doit être configuré dans le dashboard Stripe
 * avec l'URL : https://TON-DOMAINE/api/webhooks/stripe
 * 
 * Consultez GUIDE_STRIPE_ABONNEMENT_RECURRENT.md pour la configuration complète
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

    // Helper pour déterminer le plan depuis un priceId
    const getPremiumPlanFromPriceId = (priceId: string | null | undefined): "monthly" | "yearly" | null => {
      if (!priceId) return null;
      
      const monthlyPriceId = process.env.STRIPE_PRICE_ID_MENSUEL;
      const yearlyPriceId = process.env.STRIPE_PRICE_ID_ANNUEL;
      
      if (priceId === monthlyPriceId) {
        return "monthly";
      } else if (priceId === yearlyPriceId) {
        return "yearly";
      } else {
        console.warn(`[StripeWebhook] ⚠️ PriceId inconnu: ${priceId}. Plan non déterminé.`);
        return null;
      }
    };

    // Helper pour extraire le priceId d'une subscription
    const getPriceIdFromSubscription = (subscription: Stripe.Subscription): string | null => {
      // Essayer subscription.items.data[0].price.id (nouvelle API)
      if (subscription.items?.data?.[0]?.price?.id) {
        return subscription.items.data[0].price.id;
      }
      // Fallback: subscription.items.data[0].plan.id (ancienne API)
      if (subscription.items?.data?.[0]?.plan?.id) {
        return subscription.items.data[0].plan.id;
      }
      return null;
    };

    // Helper pour récupérer userId depuis metadata ou lookup par customer_id
    const getUserIdFromSubscription = async (
      subscription: Stripe.Subscription,
      customerId: string
    ): Promise<string | null> => {
      // Méthode 1 : Depuis les metadata de la subscription
      if (subscription.metadata?.userId) {
        return subscription.metadata.userId;
      }
      
      // Méthode 2 : Depuis les metadata du customer (si disponible)
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
      
      // Méthode 3 : Lookup par stripe_customer_id dans Supabase
      if (customerId) {
        const { data: profile } = await supabaseAdmin!
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        
        if (profile?.id) {
          return profile.id;
        }
      }
      
      return null;
    };

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

        // Récupérer la subscription pour obtenir le plan et la date de fin
        let premiumPlan: "monthly" | "yearly" | null = null;
        let premiumEndDate: string | null = null;

        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = getPriceIdFromSubscription(subscription);
            premiumPlan = getPremiumPlanFromPriceId(priceId);
            
            if (subscription.current_period_end) {
              premiumEndDate = new Date(subscription.current_period_end * 1000).toISOString();
            }

            console.log(
              `[StripeWebhook] 📦 Subscription détails: priceId=${priceId}, premiumPlan=${premiumPlan}, premiumEndDate=${premiumEndDate}`
            );
          } catch (err) {
            console.error(`[StripeWebhook] ❌ Erreur lors de la récupération de la subscription ${subscriptionId}:`, err);
          }
        }

        // Mettre à jour le profil dans Supabase via l'email
        const { data: updatedProfile, error } = await supabaseAdmin!
          .from("profiles")
          .update({
            premium_active: true,
            premium_plan: premiumPlan,
            premium_start_date: new Date().toISOString(),
            premium_end_date: premiumEndDate,
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
              `[Webhook Stripe] ✅ Premium activé pour ${email} (profil ID: ${updatedProfile[0].id}, plan: ${premiumPlan}, endDate: ${premiumEndDate})`
            );
          } else {
            console.warn(
              `[Webhook Stripe] ⚠️ Aucun profil trouvé avec l'email ${email}`
            );
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id || null;
        const subscriptionId = subscription.id;
        const currentPeriodEnd = subscription.current_period_end;

        console.log(
          `[StripeWebhook] 🆕 Subscription créée: customer=${customerId}, subscription=${subscriptionId}`
        );

        if (!customerId) {
          console.error(
            `[StripeWebhook] ❌ Customer ID manquant dans customer.subscription.created`
          );
          break;
        }

        // Extraire le plan et la date de fin
        const priceId = getPriceIdFromSubscription(subscription);
        const premiumPlan = getPremiumPlanFromPriceId(priceId);
        const premiumEndDate = currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null;

        console.log(
          `[StripeWebhook] 📦 Subscription détails: priceId=${priceId}, premiumPlan=${premiumPlan}, premiumEndDate=${premiumEndDate}`
        );

        // Récupérer userId
        const userId = await getUserIdFromSubscription(subscription, customerId);

        if (!userId) {
          console.warn(
            `[StripeWebhook] ⚠️ Impossible de trouver userId pour customer: ${customerId}`
          );
          break;
        }

        // Mettre à jour le profil
        const { data: updatedProfile, error } = await supabaseAdmin!
          .from("profiles")
          .update({
            premium_active: true,
            premium_plan: premiumPlan,
            premium_end_date: premiumEndDate,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq("id", userId)
          .select();

        if (error) {
          console.error(
            `[StripeWebhook] ❌ Erreur lors de la mise à jour du profil:`,
            error
          );
        } else if (updatedProfile && updatedProfile.length > 0) {
          console.log(
            `[StripeWebhook] ✅ Profil mis à jour (userId: ${userId}, plan: ${premiumPlan}, endDate: ${premiumEndDate})`
          );
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id || null;
        const subscriptionId = subscription.id;
        const status = subscription.status; // active, canceled, unpaid, past_due, etc.
        const cancelAtPeriodEnd = subscription.cancel_at_period_end; // true si annulé mais actif jusqu'à la fin
        const currentPeriodEnd = subscription.current_period_end; // Timestamp de fin de période

        console.log(
          `[Webhook Stripe] 🧾 Subscription update: status=${status}, cancel_at_period_end=${cancelAtPeriodEnd}, customer=${customerId}, subscription=${subscriptionId}`
        );

        if (!customerId) {
          console.error(
            `[Webhook Stripe] ❌ Customer ID manquant dans ${event.type}`
          );
          break;
        }

        // Extraire le plan et la date de fin
        const priceId = getPriceIdFromSubscription(subscription);
        const premiumPlan = getPremiumPlanFromPriceId(priceId);
        const premiumEndDate = currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null;

        console.log(
          `[StripeWebhook] 📦 Subscription détails: priceId=${priceId}, premiumPlan=${premiumPlan}, premiumEndDate=${premiumEndDate}`
        );

        // Récupérer userId
        const userId = await getUserIdFromSubscription(subscription, customerId);

        // Si l'abonnement est complètement supprimé, désactiver immédiatement
        if (event.type === "customer.subscription.deleted") {
          console.log(
            `[Webhook Stripe] 🛑 Abonnement supprimé pour customer: ${customerId}, subscription: ${subscriptionId}`
          );

          // Utiliser userId si disponible, sinon fallback sur customer_id
          const updateData: any = {
            premium_active: false,
            premium_end_date: new Date().toISOString(), // Date de suppression
            premium_plan: null, // Réinitialiser le plan
          };

          let result;
          if (userId) {
            result = await supabaseAdmin!
              .from("profiles")
              .update(updateData)
              .eq("id", userId)
              .select();
          } else {
            result = await supabaseAdmin!
              .from("profiles")
              .update(updateData)
              .eq("stripe_customer_id", customerId)
              .select();
          }

          if (result.error) {
            console.error(
              `[Webhook Stripe] ❌ Erreur lors de la désactivation du premium:`,
              result.error
            );
          } else if (result.data && result.data.length > 0) {
            console.log(
              `[Webhook Stripe] ✅ Premium désactivé pour ${result.data.length} profil(s) (customer: ${customerId}, userId: ${userId || "N/A"})`
            );
          }
          break;
        }

        // Pour customer.subscription.updated
        // Si l'abonnement est annulé mais actif jusqu'à la fin de la période
        if (cancelAtPeriodEnd && currentPeriodEnd) {
          console.log(
            `[Webhook Stripe] 📅 Abonnement annulé mais actif jusqu'à ${premiumEndDate} pour customer: ${customerId}`
          );

          // Garder premium_active à true mais mettre à jour premium_end_date et premium_plan
          const updateData: any = {
            premium_active: true, // Toujours actif jusqu'à la fin de la période
            premium_plan: premiumPlan,
            premium_end_date: premiumEndDate,
          };

          let result;
          if (userId) {
            result = await supabaseAdmin!
              .from("profiles")
              .update(updateData)
              .eq("id", userId)
              .select();
          } else {
            result = await supabaseAdmin!
              .from("profiles")
              .update(updateData)
              .eq("stripe_customer_id", customerId)
              .select();
          }

          if (result.error) {
            console.error(
              `[Webhook Stripe] ❌ Erreur lors de la mise à jour:`,
              result.error
            );
          } else if (result.data && result.data.length > 0) {
            console.log(
              `[Webhook Stripe] ✅ Premium maintenu jusqu'à ${premiumEndDate} pour ${result.data.length} profil(s) (plan: ${premiumPlan})`
            );
          }
          break;
        }

        // Si l'abonnement est complètement annulé (pas juste "cancel_at_period_end")
        const mustDisable =
          status === "canceled" ||
          status === "unpaid" ||
          status === "incomplete_expired" ||
          status === "past_due";

        if (mustDisable) {
          console.log(
            `[Webhook Stripe] 🛑 Abonnement inactif (status=${status}) pour customer: ${customerId}, subscription: ${subscriptionId}`
          );

          // Désactiver le premium dans Supabase
          const updateData: any = {
            premium_active: false,
            premium_end_date: new Date().toISOString(),
            premium_plan: null, // Réinitialiser le plan
          };

          let result;
          if (userId) {
            result = await supabaseAdmin!
              .from("profiles")
              .update(updateData)
              .eq("id", userId)
              .select();
          } else {
            // Essayer avec customer_id d'abord
            result = await supabaseAdmin!
              .from("profiles")
              .update(updateData)
              .eq("stripe_customer_id", customerId)
              .select();

            // Si pas trouvé, essayer avec subscription_id
            if ((!result.data || result.data.length === 0) && subscriptionId) {
              result = await supabaseAdmin!
                .from("profiles")
                .update(updateData)
                .eq("stripe_subscription_id", subscriptionId)
                .select();
            }
          }

          if (result.error) {
            console.error(
              `[Webhook Stripe] ❌ Erreur lors de la désactivation du premium:`,
              result.error
            );
          } else {
            if (result.data && result.data.length > 0) {
              console.log(
                `[Webhook Stripe] ✅ Premium désactivé pour ${result.data.length} profil(s) (customer: ${customerId}, userId: ${userId || "N/A"})`
              );
            } else {
              console.warn(
                `[Webhook Stripe] ⚠️ Aucun profil trouvé avec customer_id: ${customerId} ou subscription_id: ${subscriptionId}`
              );
            }
          }
        } else {
          // Abonnement toujours actif, mettre à jour premium_end_date et premium_plan
          const updateData: any = {
            premium_active: true,
            premium_plan: premiumPlan,
            premium_end_date: premiumEndDate,
          };

          let result;
          if (userId) {
            result = await supabaseAdmin!
              .from("profiles")
              .update(updateData)
              .eq("id", userId)
              .select();
          } else {
            result = await supabaseAdmin!
              .from("profiles")
              .update(updateData)
              .eq("stripe_customer_id", customerId)
              .select();
          }

          if (result.data && result.data.length > 0) {
            console.log(
              `[Webhook Stripe] ✅ Premium mis à jour (plan: ${premiumPlan}, endDate: ${premiumEndDate}) pour ${result.data.length} profil(s)`
            );
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Renouvellement mensuel réussi
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id || null;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id || null;

        console.log(
          `[Webhook Stripe] 💳 Renouvellement réussi: invoice=${invoice.id}, subscription=${subscriptionId}, customer=${customerId}`
        );

        if (!customerId && !subscriptionId) {
          console.warn("[Webhook Stripe] ⚠️ Customer ID et Subscription ID manquants dans invoice.payment_succeeded");
          break;
        }

        // Récupérer la subscription pour obtenir le plan
        let premiumPlan: "monthly" | "yearly" | null = null;
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = getPriceIdFromSubscription(subscription);
            premiumPlan = getPremiumPlanFromPriceId(priceId);
            console.log(
              `[StripeWebhook] 📦 Subscription détails: priceId=${priceId}, premiumPlan=${premiumPlan}`
            );
          } catch (err) {
            console.error(`[StripeWebhook] ❌ Erreur lors de la récupération de la subscription ${subscriptionId}:`, err);
          }
        }

        // Mettre à jour la date de fin de l'abonnement (prolonger d'un mois)
        const nextPeriodEnd = invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null;

        const updateData: any = {
          premium_active: true,
          premium_plan: premiumPlan,
          premium_start_date: invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString()
            : undefined,
          premium_end_date: nextPeriodEnd,
        };

        let updatedProfile = null;
        let error = null;

        // Essayer avec customer_id d'abord
        if (customerId) {
          const resultByCustomer = await supabaseAdmin!
            .from("profiles")
            .update(updateData)
            .eq("stripe_customer_id", customerId)
            .select();

          updatedProfile = resultByCustomer.data;
          error = resultByCustomer.error;
        }

        // Si pas trouvé, essayer avec subscription_id
        if ((!updatedProfile || updatedProfile.length === 0) && subscriptionId) {
          const resultBySub = await supabaseAdmin!
            .from("profiles")
            .update(updateData)
            .eq("stripe_subscription_id", subscriptionId)
            .select();

          updatedProfile = resultBySub.data;
          error = resultBySub.error;
        }

        if (error) {
          console.error("[Webhook Stripe] ❌ Erreur lors de la mise à jour du renouvellement:", error);
        } else if (updatedProfile && updatedProfile.length > 0) {
          console.log(
            `[Webhook Stripe] ✅ Renouvellement enregistré pour ${updatedProfile.length} profil(s) (customer: ${customerId}, plan: ${premiumPlan}, endDate: ${nextPeriodEnd})`
          );
        } else {
          console.warn(
            `[Webhook Stripe] ⚠️ Aucun profil trouvé pour le renouvellement (customer: ${customerId}, subscription: ${subscriptionId})`
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        // Échec de paiement lors du renouvellement
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id || null;

        console.warn(
          `[Webhook Stripe] ⚠️ Échec de paiement pour le renouvellement: invoice=${invoice.id}, customer=${customerId}`
        );

        // Optionnel : vous pouvez désactiver le premium ou envoyer un email
        // Pour l'instant, on laisse Stripe gérer les tentatives de paiement
        break;
      }

      default:
        console.log(`[Webhook Stripe] Événement non géré: ${event.type}`);
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

// On s'assure d'être côté Node (pas Edge) pour Stripe
export const runtime = "nodejs";
