import { createClient } from "@supabase/supabase-js";

// Récupérer les variables d'environnement
// Note: En production, ces variables sont injectées au moment du BUILD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

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
