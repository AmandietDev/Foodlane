"use client";

import { useEffect, useState } from "react";

export default function EnvChecker() {
  const [envStatus, setEnvStatus] = useState<{
    configured: boolean;
    hasUrl: boolean;
    hasKey: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    // Vérifier côté client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const hasUrl = !!supabaseUrl;
    const hasKey = !!supabaseKey;
    const configured = hasUrl && hasKey;

    setEnvStatus({
      configured,
      hasUrl,
      hasKey,
      message: configured
        ? "✅ Variables configurées côté client"
        : `❌ Variables manquantes côté client (URL: ${hasUrl ? "✅" : "❌"}, Key: ${hasKey ? "✅" : "❌"})`,
    });

    // Vérifier aussi côté serveur via l'API
    fetch("/api/debug-env")
      .then((res) => res.json())
      .then((data) => {
        console.log("[EnvChecker] État côté serveur:", data);
        if (!data.configured) {
          console.error(
            "[EnvChecker] ⚠️ Les variables ne sont PAS chargées côté serveur non plus. Le build doit être refait."
          );
        }
      })
      .catch((err) => {
        console.error("[EnvChecker] Erreur lors de la vérification API:", err);
      });
  }, []);

  if (!envStatus) {
    return null;
  }

  if (envStatus.configured) {
    return null; // Ne rien afficher si tout est OK
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-50 border-2 border-red-500 rounded-lg p-4 max-w-md z-50 shadow-lg">
      <h3 className="font-bold text-red-700 mb-2">⚠️ Variables d'environnement manquantes</h3>
      <div className="text-sm text-red-600 space-y-1">
        <p>URL: {envStatus.hasUrl ? "✅" : "❌"}</p>
        <p>Key: {envStatus.hasKey ? "✅" : "❌"}</p>
        <p className="mt-2 font-semibold">Solution:</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Vercel → Settings → Environment Variables</li>
          <li>Vérifiez que les variables sont présentes</li>
          <li>Cochez Production, Preview, ET Development</li>
          <li>Deployments → 3 points (⋯) → Redeploy</li>
          <li>Décochez "Use existing Build Cache"</li>
          <li>Attendez la fin du build</li>
        </ol>
      </div>
    </div>
  );
}

