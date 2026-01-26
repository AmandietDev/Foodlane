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

    // Helper pour déterminer le plan depuis une subscription Stripe
    const getPremiumPlanFromSubscription = (subscription: Stripe.Subscription): { plan: "monthly" | "yearly" | null; priceId: string | null; interval: string | null } => {
      try {
        const item = subscription.items?.data?.[0];
        const price = item?.price;
        const priceId = price?.id || null;
        const interval = price?.recurring?.interval || null; // "month" | "year"
        
        let premiumPlan: "monthly" | "yearly" | null = null;
        
        // Méthode 1 : Utiliser l'interval directement
        if (interval === "month") {
          premiumPlan = "monthly";
        } else if (interval === "year") {
          premiumPlan = "yearly";
        }
        
        // Méthode 2 : Fallback sur les priceIds des variables d'environnement
        if (!premiumPlan && priceId) {
          const monthlyPriceId = process.env.STRIPE_PRICE_ID_MENSUEL;
          const yearlyPriceId = process.env.STRIPE_PRICE_ID_ANNUEL;
          
          if (priceId === monthlyPriceId) {
            premiumPlan = "monthly";
          } else if (priceId === yearlyPriceId) {
            premiumPlan = "yearly";
          }
        }
        
        console.log(`[StripeWebhook] interval: ${interval}, priceId: ${priceId}, premiumPlan: ${premiumPlan}`);
        
        return { plan: premiumPlan, priceId, interval };
      } catch (err) {
        console.error(`[StripeWebhook] ❌ Erreur lors de la récupération du plan depuis la subscription:`, err);
        return { plan: null, priceId: null, interval: null };
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

        // Récupérer userId depuis metadata (priorité)
        const userId = session.metadata?.userId || null;
        
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id || null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id || null;

        if (!subscriptionId) {
          console.error("[WEBHOOK] ❌ Subscription ID manquant dans checkout.session.completed");
          break;
        }

        console.log(
          `[WEBHOOK] 💳 checkout.session.completed - userId: ${userId}, customer: ${customerId}, subscription: ${subscriptionId}`
        );

        // Récupérer la subscription complète pour obtenir le plan et la date de fin
        let premiumPlan: "monthly" | "yearly" | null = null;
        let premiumEndDate: string | null = null;

        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
          
          const planInfo = getPremiumPlanFromSubscription(subscription);
          premiumPlan = planInfo.plan;
          
          if (subscription.current_period_end) {
            premiumEndDate = new Date(subscription.current_period_end * 1000).toISOString();
          }

          console.log(
            `[WEBHOOK] 📦 plan: ${premiumPlan}, end_date: ${premiumEndDate}, priceId: ${planInfo.priceId}, interval: ${planInfo.interval}`
          );
        } catch (err) {
          console.error(`[WEBHOOK] ❌ Erreur lors de la récupération de la subscription ${subscriptionId}:`, err);
          break;
        }

        if (!premiumPlan) {
          console.error("[WEBHOOK] ❌ Impossible de déterminer le plan premium");
          break;
        }

        // Mettre à jour le profil dans Supabase via userId (priorité) ou customer_id
        const updateData: any = {
          premium_active: true,
          premium_end_date: premiumEndDate,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        };
        // Inclure premium_plan uniquement si premiumPlan n'est pas null
        if (premiumPlan) {
          updateData.premium_plan = premiumPlan;
        }

        let result;
        if (userId) {
          result = await supabaseAdmin!
            .from("profiles")
            .update(updateData)
            .eq("id", userId)
            .select();
        } else if (customerId) {
          // Fallback : utiliser customer_id si userId non disponible
          result = await supabaseAdmin!
            .from("profiles")
            .update(updateData)
            .eq("stripe_customer_id", customerId)
            .select();
        } else {
          console.error("[WEBHOOK] ❌ userId et customerId manquants");
          break;
        }

        if (result.error) {
          console.error("[WEBHOOK] ❌ Erreur lors de l'activation du premium:", result.error);
        } else if (result.data && result.data.length > 0) {
          console.log(
            `[WEBHOOK] ✅ updated profile ${result.data[0].id} - plan: ${premiumPlan}, end_date: ${premiumEndDate}`
          );
        } else {
          console.warn(`[WEBHOOK] ⚠️ Aucun profil trouvé (userId: ${userId}, customerId: ${customerId})`);
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

        console.log(
          `[WEBHOOK] 🆕 customer.subscription.created - customer: ${customerId}, subscription: ${subscriptionId}`
        );

        if (!customerId) {
          console.error(`[WEBHOOK] ❌ Customer ID manquant`);
          break;
        }

        // Récupérer userId depuis metadata (priorité)
        const userId = subscription.metadata?.userId || await getUserIdFromSubscription(subscription, customerId);

        if (!userId) {
          console.warn(`[WEBHOOK] ⚠️ Impossible de trouver userId pour customer: ${customerId}`);
          break;
        }

        // Récupérer la subscription complète pour obtenir le plan
        let premiumPlan: "monthly" | "yearly" | null = null;
        let premiumEndDate: string | null = null;

        try {
          const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
          
          const planInfo = getPremiumPlanFromSubscription(fullSubscription);
          premiumPlan = planInfo.plan;
          premiumEndDate = fullSubscription.current_period_end
            ? new Date(fullSubscription.current_period_end * 1000).toISOString()
            : null;

          console.log(`[WEBHOOK] 📦 plan: ${premiumPlan}, end_date: ${premiumEndDate}, priceId: ${planInfo.priceId}, interval: ${planInfo.interval}`);
        } catch (err) {
          console.error(`[WEBHOOK] ❌ Erreur lors de la récupération de la subscription:`, err);
          break;
        }

        if (!premiumPlan) {
          console.error(`[WEBHOOK] ❌ Impossible de déterminer le plan premium`);
          break;
        }

        // Mettre à jour le profil
        const updateData: any = {
          premium_active: true,
          premium_end_date: premiumEndDate,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        };
        // Inclure premium_plan uniquement si premiumPlan n'est pas null
        if (premiumPlan) {
          updateData.premium_plan = premiumPlan;
        }

        const { data: updatedProfile, error } = await supabaseAdmin!
          .from("profiles")
          .update(updateData)
          .eq("id", userId)
          .select();

        if (error) {
          console.error(`[WEBHOOK] ❌ Erreur lors de la mise à jour du profil:`, error);
        } else if (updatedProfile && updatedProfile.length > 0) {
          console.log(
            `[WEBHOOK] ✅ updated profile ${userId} - plan: ${premiumPlan}, end_date: ${premiumEndDate}`
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
          `[WEBHOOK] 🧾 ${event.type} - status: ${status}, cancel_at_period_end: ${cancelAtPeriodEnd}, customer: ${customerId}, subscription: ${subscriptionId}`
        );

        if (!customerId) {
          console.error(`[WEBHOOK] ❌ Customer ID manquant`);
          break;
        }

        // Récupérer userId depuis metadata (priorité)
        const userId = subscription.metadata?.userId || await getUserIdFromSubscription(subscription, customerId);

        // Récupérer la subscription complète pour obtenir le plan
        let premiumPlan: "monthly" | "yearly" | null = null;
        let premiumEndDate: string | null = null;

        try {
          const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
          
          const planInfo = getPremiumPlanFromSubscription(fullSubscription);
          premiumPlan = planInfo.plan;
          premiumEndDate = fullSubscription.current_period_end
            ? new Date(fullSubscription.current_period_end * 1000).toISOString()
            : null;

          console.log(`[WEBHOOK] 📦 plan: ${premiumPlan}, end_date: ${premiumEndDate}, priceId: ${planInfo.priceId}, interval: ${planInfo.interval}`);
        } catch (err) {
          console.error(`[WEBHOOK] ❌ Erreur lors de la récupération de la subscription:`, err);
          break;
        }

        // Si l'abonnement est complètement supprimé, garder premium actif jusqu'à current_period_end
        if (event.type === "customer.subscription.deleted") {
          console.log(
            `[WEBHOOK] 🛑 customer.subscription.deleted - Premium maintenu jusqu'à ${premiumEndDate || "maintenant"}`
          );

          // Garder premium_active = false mais conserver premium_end_date si current_period_end existe
          // Option: garder premium_active = true jusqu'à current_period_end (meilleure UX)
          const updateData: any = {
            premium_active: false,
            premium_end_date: premiumEndDate || new Date().toISOString(), // Garder end_date si disponible
          };
          // Inclure premium_plan uniquement si premiumPlan n'est pas null
          if (premiumPlan) {
            updateData.premium_plan = premiumPlan;
          }

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
            console.error(`[WEBHOOK] ❌ Erreur lors de la mise à jour:`, result.error);
          } else if (result.data && result.data.length > 0) {
            console.log(
              `[WEBHOOK] ✅ updated profile ${userId || customerId} - premium_active: false, end_date: ${premiumEndDate}, plan: ${premiumPlan}`
            );
          }
          break;
        }

        // Pour customer.subscription.updated
        // Si l'abonnement est annulé mais actif jusqu'à la fin de la période
        if (cancelAtPeriodEnd && currentPeriodEnd) {
          console.log(
            `[WEBHOOK] 📅 cancel_at_period_end=true - Premium actif jusqu'à ${premiumEndDate}`
          );

          // Garder premium_active à true mais mettre à jour premium_end_date et premium_plan
          const updateData: any = {
            premium_active: true, // Toujours actif jusqu'à la fin de la période
            premium_end_date: premiumEndDate,
          };
          // Inclure premium_plan uniquement si premiumPlan n'est pas null
          if (premiumPlan) {
            updateData.premium_plan = premiumPlan;
          }

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
        // Pour canceled et incomplete_expired : garder premium actif jusqu'à current_period_end
        // Pour unpaid et past_due : désactiver immédiatement (paiement échoué)
        const isCanceled = status === "canceled" || status === "incomplete_expired";
        const isUnpaid = status === "unpaid" || status === "past_due";

        if (isCanceled) {
          // Annulation : garder premium actif jusqu'à la fin de la période (meilleure UX)
          console.log(
            `[WEBHOOK] 🛑 status=${status} - Premium maintenu jusqu'à ${premiumEndDate}`
          );

          const updateData: any = {
            premium_active: true, // Reste actif jusqu'à premium_end_date
            premium_end_date: premiumEndDate || new Date().toISOString(),
          };
          // Inclure premium_plan uniquement si premiumPlan n'est pas null
          if (premiumPlan) {
            updateData.premium_plan = premiumPlan;
          }

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

            if ((!result.data || result.data.length === 0) && subscriptionId) {
              result = await supabaseAdmin!
                .from("profiles")
                .update(updateData)
                .eq("stripe_subscription_id", subscriptionId)
                .select();
            }
          }

          if (result.error) {
            console.error(`[WEBHOOK] ❌ Erreur lors de la mise à jour:`, result.error);
          } else {
            if (result.data && result.data.length > 0) {
              console.log(
                `[WEBHOOK] ✅ updated profile ${userId || customerId} - premium_active: true, end_date: ${premiumEndDate}, plan: ${premiumPlan}`
              );
            } else {
              console.warn(
                `[WEBHOOK] ⚠️ Aucun profil trouvé (customerId: ${customerId}, subscriptionId: ${subscriptionId})`
              );
            }
          }
        } else if (isUnpaid) {
          // Paiement échoué : désactiver immédiatement
          console.log(
            `[WEBHOOK] 🛑 status=${status} - Premium désactivé immédiatement`
          );

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
            result = await supabaseAdmin!
              .from("profiles")
              .update(updateData)
              .eq("stripe_customer_id", customerId)
              .select();

            if ((!result.data || result.data.length === 0) && subscriptionId) {
              result = await supabaseAdmin!
                .from("profiles")
                .update(updateData)
                .eq("stripe_subscription_id", subscriptionId)
                .select();
            }
          }

          if (result.error) {
            console.error(`[WEBHOOK] ❌ Erreur lors de la désactivation:`, result.error);
          } else {
            if (result.data && result.data.length > 0) {
              console.log(
                `[WEBHOOK] ✅ updated profile ${userId || customerId} - premium_active: false`
              );
            } else {
              console.warn(
                `[WEBHOOK] ⚠️ Aucun profil trouvé (customerId: ${customerId}, subscriptionId: ${subscriptionId})`
              );
            }
          }
        } else {
          // Abonnement toujours actif, mettre à jour premium_end_date et premium_plan
          if (!premiumPlan) {
            console.warn(`[WEBHOOK] ⚠️ Plan non déterminé, mise à jour partielle`);
          }

          const updateData: any = {
            premium_active: true,
            premium_end_date: premiumEndDate,
          };
          // Inclure premium_plan uniquement si premiumPlan n'est pas null
          if (premiumPlan) {
            updateData.premium_plan = premiumPlan;
          }

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
            console.error(`[WEBHOOK] ❌ Erreur lors de la mise à jour:`, result.error);
          } else if (result.data && result.data.length > 0) {
            console.log(
              `[WEBHOOK] ✅ updated profile ${userId || customerId} - plan: ${premiumPlan}, end_date: ${premiumEndDate}`
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

        // Récupérer la subscription pour obtenir le plan et la date de fin
        let premiumPlan: "monthly" | "yearly" | null = null;
        let premiumEndDate: string | null = null;

        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ["items.data.price"],
            });
            const planInfo = getPremiumPlanFromSubscription(subscription);
            premiumPlan = planInfo.plan;
            premiumEndDate = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null;
            console.log(`[WEBHOOK] 📦 plan: ${premiumPlan}, end_date: ${premiumEndDate}, priceId: ${planInfo.priceId}, interval: ${planInfo.interval}`);
          } catch (err) {
            console.error(`[WEBHOOK] ❌ Erreur lors de la récupération de la subscription:`, err);
            break;
          }
        }

        const updateData: any = {
          premium_active: true,
          premium_end_date: premiumEndDate,
        };
        // Inclure premium_plan uniquement si premiumPlan n'est pas null
        if (premiumPlan) {
          updateData.premium_plan = premiumPlan;
        }

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
          console.error("[WEBHOOK] ❌ Erreur lors de la mise à jour du renouvellement:", error);
        } else if (updatedProfile && updatedProfile.length > 0) {
          console.log(
            `[WEBHOOK] ✅ updated profile - plan: ${premiumPlan}, end_date: ${premiumEndDate}`
          );
        } else {
          console.warn(
            `[WEBHOOK] ⚠️ Aucun profil trouvé (customerId: ${customerId}, subscriptionId: ${subscriptionId})`
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
    return NextResponse.json({ 
      ok: true, 
      message: "Webhook traité avec succès",
      event: event.type 
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

// On s'assure d'être côté Node (pas Edge) pour Stripe
export const runtime = "nodejs";
