import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../src/lib/supabaseAdmin";

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const ALLOWED_SOURCES = new Set(["coming_soon", "app_store", "google_play", "landing"]);

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) return null;
  return email;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown; source?: unknown };
    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }

    const sourceRaw = typeof body.source === "string" ? body.source.trim().toLowerCase() : "coming_soon";
    const source = ALLOWED_SOURCES.has(sourceRaw) ? sourceRaw : "coming_soon";

    if (!supabaseAdmin) {
      console.error("[app-launch-waitlist] Supabase admin non configuré");
      return NextResponse.json(
        { error: "Inscription temporairement indisponible. Réessaie plus tard." },
        { status: 503 }
      );
    }

    const { error } = await supabaseAdmin.from("app_launch_waitlist").insert({
      email,
      source,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({
          success: true,
          alreadyRegistered: true,
          message: "Cette adresse est déjà inscrite. Tu seras alerté(e) dès la mise en ligne.",
        });
      }
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "La base d'inscription n'est pas encore configurée. Exécute la migration Supabase 028_app_launch_waitlist.sql.",
          },
          { status: 503 }
        );
      }
      console.error("[app-launch-waitlist] insert:", error);
      return NextResponse.json({ error: "Impossible d'enregistrer ton e-mail." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Merci ! Tu recevras un e-mail dès que l'application sera disponible.",
    });
  } catch (e) {
    console.error("[app-launch-waitlist]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
