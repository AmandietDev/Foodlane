import { NextRequest, NextResponse } from "next/server";
import { sendMessageToFoodlane } from "../../src/lib/contactEmail";

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, prenom, email, telephone, objet, message } = body;

    if (!email || !objet || !message) {
      return NextResponse.json(
        { error: "Email, objet et message sont requis" },
        { status: 400 }
      );
    }

    const safeNom = escHtml(nom || "Non renseigné");
    const safePrenom = escHtml(prenom || "Non renseigné");
    const safeEmail = escHtml(email);
    const safeTel = escHtml(telephone || "Non renseigné");
    const safeObjet = escHtml(String(objet));
    const safeMessage = escHtml(String(message)).replace(/\n/g, "<br/>");

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #8B6F47; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #8B6F47; }
    .message-box { background-color: white; padding: 15px; border-left: 4px solid #8B6F47; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Message depuis le formulaire de contact Foodlane</h2>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">Nom:</span> ${safeNom}
      </div>
      <div class="field">
        <span class="label">Prénom:</span> ${safePrenom}
      </div>
      <div class="field">
        <span class="label">Email:</span> ${safeEmail}
      </div>
      <div class="field">
        <span class="label">Téléphone:</span> ${safeTel}
      </div>
      <div class="message-box">
        <div class="field">
          <span class="label">Objet:</span> ${safeObjet}
        </div>
        <div class="field">
          <span class="label">Message:</span><br>
          ${safeMessage}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

    const text = [
      "Contact Foodlane",
      `Nom: ${nom || "—"}`,
      `Prénom: ${prenom || "—"}`,
      `Email: ${email}`,
      `Téléphone: ${telephone || "—"}`,
      "",
      `Objet: ${objet}`,
      "",
      String(message),
    ].join("\n");

    const result = await sendMessageToFoodlane({
      subject: `[Foodlane Contact] ${objet}`.slice(0, 200),
      html: emailBody,
      text,
      replyTo: email,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: "Message envoyé avec succès" }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de l’envoi du message:", error);
    return NextResponse.json({ error: "Erreur lors de l’envoi du message" }, { status: 500 });
  }
}
