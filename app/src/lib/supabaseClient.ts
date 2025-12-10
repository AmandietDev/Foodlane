import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";
  const errorMessage = isProduction
    ? `[SupabaseClient] Variables d'environnement manquantes sur Vercel.
    
⚠️ IMPORTANT : Les variables d'environnement sont chargées au moment du BUILD.
Si vous venez d'ajouter les variables dans Vercel, vous DEVEZ redéployer :

1. Allez dans Vercel → Deployments
2. Cliquez sur les 3 points (⋯) du dernier déploiement
3. Sélectionnez "Redeploy"
4. Attendez la fin du build

Vérifiez aussi que :
- Les variables sont dans Vercel → Settings → Environment Variables
- Vous avez coché Production, Preview, ET Development
- Les noms sont exactement : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY

Pour vérifier : visitez /api/debug-env`
    : "[SupabaseClient] Variables d'environnement manquantes. Créez un fichier .env.local à la racine du projet avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY. Voir .env.example pour référence.";
  console.error(errorMessage);
}

// Créer le client même si les variables sont manquantes (pour éviter les crashes)
// Les erreurs seront gérées dans les hooks
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);
