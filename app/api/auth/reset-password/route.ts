import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { isValidResetPassword } from "../../../src/lib/passwordPolicy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  if (!isValidResetPassword(password)) {
    return NextResponse.json(
      { error: "Mot de passe invalide : au moins 8 caractères, une majuscule et un chiffre." },
      { status: 400 }
    );
  }

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("token, user_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
  }

  if (row.used_at) {
    return NextResponse.json({ error: "Ce lien a déjà été utilisé." }, { status: 400 });
  }

  const exp = new Date(row.expires_at as string).getTime();
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return NextResponse.json({ error: "Ce lien a expiré. Demande un nouvel e-mail." }, { status: 400 });
  }

  const userId = row.user_id as string;

  const { error: updAuthErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
  });

  if (updAuthErr) {
    console.error("[reset-password] updateUser", updAuthErr);
    return NextResponse.json(
      { error: "Impossible de mettre à jour le mot de passe. Réessaie plus tard." },
      { status: 500 }
    );
  }

  await supabaseAdmin.from("password_reset_tokens").delete().eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
