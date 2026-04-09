import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getAppBaseUrl, sendPasswordResetEmail } from "../../../src/lib/sendPasswordResetEmail";

export const dynamic = "force-dynamic";

const GENERIC_OK = {
  ok: true,
  message:
    "Si cette adresse est associée à un compte, tu recevras un e-mail avec un lien pour réinitialiser ton mot de passe.",
};

export async function POST(request: NextRequest) {
  try {
    let email: string;
    try {
      const body = await request.json();
      email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(GENERIC_OK);
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profileErr) {
      console.error("[forgot-password] profiles", profileErr);
    }

    if (!profile?.id) {
      return NextResponse.json(GENERIC_OK);
    }

    const userId = profile.id as string;
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error: insErr } = await supabaseAdmin.from("password_reset_tokens").insert({
      token,
      user_id: userId,
      expires_at: expiresAt,
    });

    if (insErr) {
      console.error("[forgot-password] insert token", insErr);
      return NextResponse.json(GENERIC_OK);
    }

    const base = getAppBaseUrl(request);
    const resetLink = `${base}/reset-password?token=${token}`;

    await sendPasswordResetEmail({ to: email, resetLink });

    return NextResponse.json(GENERIC_OK);
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json(GENERIC_OK);
  }
}
