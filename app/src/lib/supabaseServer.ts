/**
 * Helper pour créer un client Supabase côté serveur avec les cookies de la requête
 * Utilisé dans les API routes Next.js
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Récupère l'ID utilisateur depuis la requête
 * Essaie plusieurs méthodes : body userId, header Authorization, ou cookies Supabase
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // Méthode 1 : Depuis le body (si fourni explicitement)
  try {
    const body = await request.clone().json().catch(() => null);
    if (body?.userId) {
      return body.userId;
    }
  } catch {
    // Ignorer si pas de body JSON
  }

  // Méthode 2 : Depuis le header Authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      return user.id;
    }
  }

  // Méthode 3 : Depuis les cookies Supabase
  // Supabase stocke les cookies avec des noms comme "sb-<project-ref>-auth-token"
  // On essaie de trouver le cookie d'auth Supabase
  const allCookies = request.cookies.getAll();
  const authCookie = allCookies.find(c => c.name.includes("auth-token") || c.name.includes("access-token"));
  
  if (authCookie) {
    try {
      const cookieValue = JSON.parse(decodeURIComponent(authCookie.value));
      if (cookieValue?.access_token) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user } } = await supabase.auth.getUser(cookieValue.access_token);
        if (user) {
          return user.id;
        }
      }
    } catch {
      // Ignorer si le cookie n'est pas au format attendu
    }
  }

  return null;
}

