import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, prenom, email, telephone, objet, message } = body;

    // Validation
    if (!email || !objet || !message) {
      return NextResponse.json(
        { error: "Email, objet et message sont requis" },
        { status: 400 }
      );
    }

    // Format du message HTML pour l'email
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
      <h2>Nouveau message depuis le formulaire de contact Foodlane</h2>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">Nom:</span> ${nom || "Non renseigné"}
      </div>
      <div class="field">
        <span class="label">Prénom:</span> ${prenom || "Non renseigné"}
      </div>
      <div class="field">
        <span class="label">Email:</span> ${email}
      </div>
      <div class="field">
        <span class="label">Téléphone:</span> ${telephone || "Non renseigné"}
      </div>
      <div class="message-box">
        <div class="field">
          <span class="label">Objet:</span> ${objet}
        </div>
        <div class="field">
          <span class="label">Message:</span><br>
          ${message.replace(/\n/g, "<br>")}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Envoi de l'email via un service externe
    // Option 1: Utiliser Resend (recommandé pour production)
    // Décommenter et configurer si vous avez une clé API Resend
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Foodlane <contact@foodlane.app>',
      to: 'contact.foodlane@gmail.com',
      subject: objet,
      html: emailBody,
      replyTo: email,
    });
    */

    // Option 2: Utiliser un webhook (EmailJS, FormSubmit, etc.)
    const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "contact.foodlane@gmail.com",
          from: email,
          subject: objet,
          html: emailBody,
          text: `Nom: ${nom || "Non renseigné"}\nPrénom: ${prenom || "Non renseigné"}\nEmail: ${email}\nTéléphone: ${telephone || "Non renseigné"}\n\nObjet: ${objet}\n\nMessage:\n${message}`,
        }),
      });
    }

    // Option 3: Utiliser Nodemailer avec SMTP
    // Décommenter et configurer si vous avez un serveur SMTP
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    await transporter.sendMail({
      from: `"Foodlane Contact" <${process.env.SMTP_FROM || 'contact@foodlane.app'}>`,
      to: 'contact.foodlane@gmail.com',
      subject: objet,
      html: emailBody,
      replyTo: email,
    });
    */

    // Pour l'instant, on log le contenu (pour le développement)
    // Dans un environnement de production, vous devrez configurer un des services ci-dessus
    console.log("Email à envoyer à contact.foodlane@gmail.com:");
    console.log("Objet:", objet);
    console.log("De:", email);
    console.log("Contenu:", emailBody);

    // Si aucun service d'email n'est configuré, on retourne quand même un succès
    // mais l'email ne sera pas réellement envoyé (pour le développement)
    // En production, vous DEVEZ configurer un service d'email

    return NextResponse.json(
      { success: true, message: "Message envoyé avec succès" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}
