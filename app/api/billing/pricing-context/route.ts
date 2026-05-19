import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { countActiveFoundingSubscribers, getFoundersLimit } from "../../../src/lib/foundersQuota";
import { parseBetaEmailsFromEnv } from "../../../src/lib/betaWhitelistServer";

/**
 * Contexte public pour la page tarifs : quota fondateur (sans exposer la whitelist bêta).
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        foundersUsed: 0,
        foundersLimit: getFoundersLimit(),
        showFounderPricing: false,
        founderSlotsRemaining: 0,
        betaWhitelistConfigured: parseBetaEmailsFromEnv().length > 0,
      });
    }

    const used = await countActiveFoundingSubscribers(supabaseAdmin);
    const limit = getFoundersLimit();
    const remaining = Math.max(0, limit - used);

    return NextResponse.json({
      foundersUsed: used,
      foundersLimit: limit,
      showFounderPricing: remaining > 0,
      founderSlotsRemaining: remaining,
      betaWhitelistConfigured: parseBetaEmailsFromEnv().length > 0,
    });
  } catch (e) {
    console.error("[pricing-context]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
