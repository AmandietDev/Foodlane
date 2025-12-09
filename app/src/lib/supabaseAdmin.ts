/**
 * Client Supabase Admin (Service Role)
 * 
 * Ce client utilise la clé Service Role pour bypasser les RLS (Row Level Security).
 * ⚠️ À utiliser UNIQUEMENT côté serveur (dans les API routes, webhooks, etc.)
 * ⚠️ NE JAMAIS utiliser ce client côté client (dans les composants React)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "[SupabaseAdmin] Variables d'environnement manquantes. Vérifiez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY"
  );
}

// Créer le client admin avec la Service Role Key
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

