/**
 * Envoi de l’email de réinitialisation (Resend si configuré, sinon log en dev).
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  resetLink: string;
}): Promise<{ sent: boolean; devLink?: string; error?: string }> {
  const { to, resetLink } = params;
  const subject = "Réinitialisation de votre mot de passe";
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333;">
  <h1 style="color: #6B2E2E;">Réinitialisation du mot de passe</h1>
  <p>Tu as demandé à réinitialiser ton mot de passe sur Foodlane.</p>
  <p>
    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #6B2E2E; color: #fff; text-decoration: none; border-radius: 12px; font-weight: 600;">
      Choisir un nouveau mot de passe
    </a>
  </p>
  <p style="font-size: 14px; color: #666;">Ce lien expire dans <strong>1 heure</strong>.</p>
  <p style="font-size: 14px; color: #666;">Si tu n’es pas à l’origine de cette demande, tu peux ignorer cet e-mail : ton mot de passe actuel reste inchangé.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="font-size: 12px; color: #999;">Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br/>${resetLink}</p>
</body>
</html>
`.trim();

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Foodlane <onboarding@resend.dev>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[sendPasswordResetEmail] RESEND_API_KEY manquant — lien dev :", resetLink);
    } else {
      console.error("[sendPasswordResetEmail] RESEND_API_KEY requis en production pour envoyer les e-mails.");
    }
    return { sent: false, devLink: process.env.NODE_ENV === "development" ? resetLink : undefined };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[sendPasswordResetEmail] Resend error:", json);
      return { sent: false, error: (json as { message?: string }).message || res.statusText };
    }
    return { sent: true };
  } catch (e) {
    console.error("[sendPasswordResetEmail]", e);
    return { sent: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export function getAppBaseUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      /* ignore */
    }
  }
  return "http://localhost:3000";
}
