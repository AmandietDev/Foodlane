import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * Route API pour créer une session Stripe Customer Portal
 * Permet à l'utilisateur de gérer son abonnement (annulation, carte, factures)
 * 
 * Body attendu : { userId: string }
 */

export async function POST(request: NextRequest) {
  try {
    // Vérifier que Stripe est configuré
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error("[Billing Portal] STRIPE_SECRET_KEY manquante");
      return NextResponse.json(
        { error: "Stripe non configuré" },
        { status: 500 }
      );
    }

    // Récupérer userId depuis le body
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: "userId requis" },
        { status: 400 }
      );
    }

    // Initialiser Supabase avec service role key pour accès admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Billing Portal] Variables Supabase manquantes");
      return NextResponse.json(
        { error: "Configuration Supabase incomplète" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Récupérer le profil utilisateur pour obtenir stripe_customer_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[Billing Portal] Erreur lors de la récupération du profil:", profileError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération du profil" },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profil utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const stripeCustomerId = profile.stripe_customer_id;

    if (!stripeCustomerId) {
      // Si pas de customer_id, essayer de le trouver via l'email
      console.warn("[Billing Portal] stripe_customer_id manquant, tentative de récupération via email");
      
      const stripe = new Stripe(stripeSecretKey);
      
      // Chercher le customer par email
      const customers = await stripe.customers.list({
        email: profile.email || undefined,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return NextResponse.json(
          { error: "Aucun abonnement trouvé. Assurez-vous d'avoir souscrit à Premium." },
          { status: 404 }
        );
      }

      // Utiliser le premier customer trouvé
      const customerId = customers.data[0].id;
      
      // Optionnel : mettre à jour le profil avec le customer_id trouvé
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);

      // Créer la session portal avec le customer_id trouvé
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000"}/`,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    // Initialiser Stripe
    const stripe = new Stripe(stripeSecretKey);

    // Déterminer l'URL de retour (vers la page d'accueil après résiliation)
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000"}/`;

    console.log(`[Billing Portal] Création de session pour customer: ${stripeCustomerId}`);

    // Créer la session Customer Portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

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

