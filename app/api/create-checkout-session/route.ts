import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Route API pour créer une session Stripe Checkout
 * Redirige l'utilisateur vers Stripe pour le paiement
 *
 * Body attendu :
 * - userId: string (ID utilisateur Supabase)
 * - email: string (email de l'utilisateur)
 * - plan: "monthly" | "yearly" (optionnel, défaut: "monthly")
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email, plan = "monthly" } = await request.json();

    // Validation des paramètres requis
    if (!userId || !email) {
      console.error("[Checkout] Paramètres manquants:", {
        userId: !!userId,
        email: !!email,
      });
      return NextResponse.json(
        { error: "userId et email requis" },
        { status: 400 }
      );
    }

    // Validation de l'email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error("[Checkout] Email invalide:", email);
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      );
    }

    // Vérifier que la clé Stripe est configurée
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error("[Checkout] STRIPE_SECRET_KEY manquante");
      return NextResponse.json(
        { error: "Stripe non configuré. Vérifiez STRIPE_SECRET_KEY dans .env.local" },
        { status: 500 }
      );
    }

    // Récupérer le prix selon le plan choisi
    const priceId =
      plan === "yearly"
        ? process.env.STRIPE_PRICE_ID_ANNUEL
        : process.env.STRIPE_PRICE_ID_MENSUEL;

    if (!priceId) {
      const missingVar =
        plan === "yearly" ? "STRIPE_PRICE_ID_ANNUEL" : "STRIPE_PRICE_ID_MENSUEL";
      console.error(`[Checkout] ${missingVar} manquante`);

      // Message d'erreur plus détaillé pour guider l'utilisateur
      const errorMessage =
        plan === "yearly"
          ? "Configuration Stripe incomplète : STRIPE_PRICE_ID_ANNUEL manquant. Consultez STRIPE_SUPABASE_SETUP_SIMPLE.md pour configurer."
          : "Configuration Stripe incomplète : STRIPE_PRICE_ID_MENSUEL manquant. Consultez STRIPE_SUPABASE_SETUP_SIMPLE.md pour configurer.";

      return NextResponse.json(
        {
          error: errorMessage,
          details: `Ajoutez ${missingVar} dans votre fichier .env.local avec l'ID du prix créé dans Stripe Dashboard.`,
        },
        { status: 500 }
      );
    }

    // 🔧 Initialiser Stripe (on laisse le SDK choisir la version d'API)
    const stripe = new Stripe(stripeSecretKey);

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    console.log(
      `[Checkout] Création de session pour ${email} (plan: ${plan}, priceId: ${priceId})`
    );

    // Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
      customer_email: email, // Email du client (utilisé pour retrouver le profil dans le webhook)
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription", // Mode abonnement récurrent
      success_url: `${origin}/premium?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/premium?canceled=true`,
      // Metadata importante : stocker l'email et userId pour le webhook
      metadata: {
        userId: userId,
        email: email, // Email dans les metadata pour le webhook
      },
      subscription_data: {
        metadata: {
          userId: userId,
          email: email, // Email aussi dans les metadata de l'abonnement
        },
      },
    });

    console.log(`[Checkout] ✅ Session créée: ${session.id} pour ${email}`);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
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
