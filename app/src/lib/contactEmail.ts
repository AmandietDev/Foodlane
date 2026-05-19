/**
 * Envoi des formulaires (contact, avis) vers l’équipe Foodlane.
 *
 * - Adresse **affichée** dans l’app : {@link FOODLANE_PUBLIC_CONTACT_EMAIL} uniquement.
 * - Adresse **réelle** de réception (ex. Gmail) : variable d’environnement serveur
 *   `CONTACT_DELIVERY_EMAIL`, jamais exposée au client.
 *
 * Resend : `RESEND_API_KEY` + `RESEND_FROM` (domaine vérifié).
 */

/** Seule adresse à montrer aux utilisateurs (UI, mentions légales, FAQ). */
export const FOODLANE_PUBLIC_CONTACT_EMAIL = "contact@foodlane.fr";

/**
 * Destinataire effectif des e-mails (serveur uniquement).
 * Priorité : CONTACT_DELIVERY_EMAIL → CONTACT_EMAIL (rétrocompat) → adresse publique.
 */
function getDeliveryEmail(): string {
  const a =
    process.env.CONTACT_DELIVERY_EMAIL?.trim() ||
    process.env.CONTACT_EMAIL?.trim() ||
    FOODLANE_PUBLIC_CONTACT_EMAIL;
  return a;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendMessageToFoodlane(opts: {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Foodlane <onboarding@resend.dev>";
  const to = getDeliveryEmail();

  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: opts.subject.slice(0, 200),
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      console.error("[contactEmail] Resend:", res.status, errText);
      return { ok: false, error: "Échec d’envoi du message (service e-mail)." };
    }
    return { ok: true };
  }

  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
          replyTo: opts.replyTo,
        }),
      });
    } catch (e) {
      console.error("[contactEmail] webhook", e);
      return { ok: false, error: "Échec d’envoi du message (webhook)." };
    }
    return { ok: true };
  }

  console.warn(
    "[contactEmail] Aucun RESEND_API_KEY ni EMAIL_WEBHOOK_URL — message non envoyé (dev). Configurer CONTACT_DELIVERY_EMAIL pour la boîte de réception réelle."
  );
  console.log("Objet:", opts.subject);
  if (opts.replyTo) console.log("Reply-To:", opts.replyTo);
  console.log(opts.text);
  return { ok: true };
}
