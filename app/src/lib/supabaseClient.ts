import { createClient, type Session } from "@supabase/supabase-js";

// Récupérer les variables d'environnement
// Note: En production, ces variables sont injectées au moment du BUILD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** URL utilisable par fetch (évite placeholder ou chaîne vide) */
export function isLikelyValidSupabaseUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  const t = url.trim().toLowerCase();
  if (t.includes("placeholder.supabase.co")) return false;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = !!(
  supabaseUrl?.trim() &&
  supabaseAnonKey?.trim() &&
  isLikelyValidSupabaseUrl(supabaseUrl)
);

// Fonction pour vérifier et logger les variables (utile pour le debug)
if (typeof window !== "undefined") {
  // Côté client uniquement
  if (!isSupabaseConfigured) {
    console.error(
      `[SupabaseClient] Variables d'environnement manquantes côté client.
      
🔍 Diagnostic:
- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✅ Présent" : "❌ Manquant"}
- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? "✅ Présent" : "❌ Manquant"}

⚠️ SOLUTION:
1. Vérifiez Vercel → Settings → Environment Variables
2. Vérifiez que les variables sont pour Production, Preview, ET Development
3. Redéployez en allant dans Deployments → 3 points (⋯) → Redeploy
4. Attendez la fin du build (2-5 minutes)
5. Videz le cache du navigateur (Ctrl+Shift+R)

Pour vérifier côté serveur: visitez /api/debug-env`
    );
  } else {
    // Log de confirmation en mode développement uniquement
    if (process.env.NODE_ENV === "development") {
      console.log("[SupabaseClient] ✅ Variables d'environnement configurées correctement");
    }
  }
}

// Créer le client Supabase
// Si les variables sont manquantes, on utilise des placeholders pour éviter les crashes
// Les erreurs seront gérées dans les composants qui utilisent Supabase
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

/**
 * Récupère la session avec timeout et capture des rejets réseau (ex. AuthRetryableFetchError / Failed to fetch).
 * Sans cela, un await getSession() qui rejette laisse l’UI bloquée sur « Vérification de la session ».
 */
export async function getSessionResilient(timeoutMs = 10000): Promise<{
  session: Session | null;
  error: Error | null;
}> {
  if (!isSupabaseConfigured) {
    return {
      session: null,
      error: new Error(
        "Supabase n’est pas configuré côté client. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local à la racine du projet, puis redémarre le serveur (arrête et relance `npm run dev`)."
      ),
    };
  }

  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Délai dépassé (${Math.round(timeoutMs / 1000)} s) sans réponse de Supabase.`
              )
            ),
          timeoutMs
        )
      ),
    ]);

    if (result.error) {
      return {
        session: null,
        error: new Error(result.error.message || "Erreur lors de la lecture de la session"),
      };
    }

    return { session: result.data.session, error: null };
  } catch (e) {
    const base =
      e instanceof Error ? e.message : "Impossible de contacter Supabase (Failed to fetch).";
    const hint =
      " Vérifie l’URL du projet (Dashboard Supabase → Settings → API), ta connexion réseau / VPN / pare-feu, et que le fichier .env.local est bien à la racine du dépôt (pas seulement dans /app).";
    return { session: null, error: new Error(base + hint) };
  }
}
