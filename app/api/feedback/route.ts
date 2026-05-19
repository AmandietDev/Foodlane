import { NextRequest, NextResponse } from "next/server";
import { sendMessageToFoodlane } from "../../src/lib/contactEmail";
import type { Locale } from "../../src/lib/i18n";

/**
 * Avis interne (email). Trustpilot ne propose pas d’API publique pour « poster » une critique
 * depuis un formulaire custom : en prod, on utilise plutôt une invitation Trustpilot (lien / Business API)
 * en plus ou à la place de ce flux — pas de transfert automatique sans compte Trustpilot Business configuré.
 */

const LOCALES: Locale[] = ["fr", "en", "es", "de"];

function parseLocale(x: unknown): Locale {
  return typeof x === "string" && LOCALES.includes(x as Locale) ? (x as Locale) : "fr";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      comment,
      satisfaction,
      ease,
      recommend,
      email,
      locale: localeRaw,
    } = body as {
      comment?: string;
      satisfaction?: number;
      ease?: number;
      recommend?: number;
      email?: string;
      locale?: string;
    };

    const locale = parseLocale(localeRaw);

    const textComment = (comment || "").trim();
    if (!textComment || textComment.length < 5) {
      return NextResponse.json(
        { error: "Merci d’écrire un court commentaire (au moins 5 caractères)." },
        { status: 400 }
      );
    }

    const sat = Number(satisfaction);
    const ez = Number(ease);
    const rec = Number(recommend);
    const lines = [
      "— Avis utilisateur Foodlane —",
      `Langue interface: ${locale}`,
      email?.trim() ? `Email (optionnel): ${email.trim()}` : "Email: (non fourni)",
      Number.isFinite(sat) && sat >= 1 && sat <= 5 ? `Satisfaction générale: ${sat}/5` : "Satisfaction: —",
      Number.isFinite(ez) && ez >= 1 && ez <= 5 ? `Facilité d’utilisation: ${ez}/5` : "Facilité: —",
      Number.isFinite(rec) && rec >= 1 && rec <= 5 ? `Probabilité de recommandation: ${rec}/5` : "Recommandation: —",
      "",
      "Commentaire libre:",
      textComment.slice(0, 8000),
    ];
    const text = lines.join("\n");

    const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;line-height:1.5">
<h2>Avis utilisateur Foodlane</h2>
<p><strong>Langue</strong> ${locale}</p>
${email?.trim() ? `<p><strong>Email</strong> ${email.trim()}</p>` : ""}
<p>Satisfaction: ${Number.isFinite(sat) && sat >= 1 && sat <= 5 ? `${sat}/5` : "—"}</p>
<p>Facilité: ${Number.isFinite(ez) && ez >= 1 && ez <= 5 ? `${ez}/5` : "—"}</p>
<p>Recommandation: ${Number.isFinite(rec) && rec >= 1 && rec <= 5 ? `${rec}/5` : "—"}</p>
<hr/>
<p>${textComment.replace(/</g, "&lt;").replace(/\n/g, "<br/>").slice(0, 12000)}</p>
</body></html>`;

    const result = await sendMessageToFoodlane({
      subject: "[Foodlane] Avis utilisateur",
      html,
      text,
      replyTo: email?.trim() || undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[feedback]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
