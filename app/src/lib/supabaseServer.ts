/**
 * Helper pour créer un client Supabase côté serveur avec les cookies de la requête
 * Utilisé dans les API routes Next.js
 */

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type CookieLike = { name: string; value: string };

function getAccessTokenFromSupabaseCookies(allCookies: CookieLike[]): string | null {
  const authCookie = allCookies.find(
    (c) => c.name.includes("auth-token") || c.name.includes("access-token"),
  );
  if (!authCookie) return null;
  try {
    const cookieValue = JSON.parse(decodeURIComponent(authCookie.value));
    return cookieValue?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Session Supabase depuis les cookies du navigateur (Server Components / layouts).
 */
export async function getSessionUserFromCookies(): Promise<{ id: string; email: string } | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const cookieStore = await cookies();
  const token = getAccessTokenFromSupabaseCookies(cookieStore.getAll());
  if (!token) return null;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  const email = user?.email?.trim();
  if (!user?.id || !email) return null;
  return { id: user.id, email };
}

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
  const token = getAccessTokenFromSupabaseCookies(request.cookies.getAll());
  if (token) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (user) {
      return user.id;
    }
  }

  return null;
}

