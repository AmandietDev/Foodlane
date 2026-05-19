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

/** Décode la valeur de cookie session Supabase (JSON ou préfixe base64-). */
function decodeSupabaseSessionCookieValue(raw: string): string {
  const v = raw.trim();
  if (v.startsWith("base64-")) {
    const b64 = v.slice("base64-".length);
    try {
      return Buffer.from(b64, "base64url").toString("utf8");
    } catch {
      try {
        return Buffer.from(b64, "base64").toString("utf8");
      } catch {
        return v;
      }
    }
  }
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function parseSessionAccessToken(jsonStr: string): string | null {
  try {
    const parsed = JSON.parse(jsonStr) as { access_token?: string };
    return typeof parsed.access_token === "string" ? parsed.access_token : null;
  } catch {
    return null;
  }
}

/**
 * Lit le jeton d'accès Supabase depuis les cookies (cookie unique ou morceaux .0, .1, …).
 * @see https://github.com/supabase/ssr — cookies fragmentés si session volumineuse.
 */
export function getAccessTokenFromSupabaseCookies(allCookies: CookieLike[]): string | null {
  const authRelated = allCookies.filter(
    (c) => c.name.includes("auth-token") || c.name.includes("access-token"),
  );
  if (!authRelated.length) return null;

  const baseNames = new Set<string>();
  for (const c of authRelated) {
    if (!c.name.startsWith("sb-") || !c.name.includes("-auth-token")) continue;
    const m = c.name.match(/^(sb-.+-auth-token)(?:\.\d+)?$/);
    if (m) baseNames.add(m[1]);
  }

  for (const base of baseNames) {
    const single = authRelated.find((c) => c.name === base);
    if (single) {
      const decoded = decodeSupabaseSessionCookieValue(single.value);
      const token = parseSessionAccessToken(decoded);
      if (token) return token;
    }

    let assembled = "";
    let idx = 0;
    while (true) {
      const chunk = authRelated.find((c) => c.name === `${base}.${idx}`);
      if (!chunk) break;
      assembled += chunk.value;
      idx += 1;
    }
    if (idx > 0) {
      const decoded = decodeSupabaseSessionCookieValue(assembled);
      const token = parseSessionAccessToken(decoded);
      if (token) return token;
    }
  }

  for (const c of authRelated) {
    if (/auth-token|access-token/.test(c.name) && !/^sb-[^-]+-auth-token/.test(c.name)) {
      try {
        const decoded = decodeSupabaseSessionCookieValue(c.value);
        const token = parseSessionAccessToken(decoded);
        if (token) return token;
      } catch {
        /* continue */
      }
    }
  }

  return null;
}

async function getUserIdFromAuthOnly(request: NextRequest): Promise<string | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (user?.id) return user.id;
  }

  const cookieToken = getAccessTokenFromSupabaseCookies(request.cookies.getAll());
  if (cookieToken) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
    } = await supabase.auth.getUser(cookieToken);
    if (user?.id) return user.id;
  }

  return null;
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
 * Récupère l'ID utilisateur depuis la requête.
 * Priorité : Authorization Bearer → cookies Supabase.
 * Un `userId` dans le corps JSON ne compte que s'il correspond à l'utilisateur authentifié
 * (évite qu'un client usurpe un autre compte).
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authId = await getUserIdFromAuthOnly(request);

  let bodyUserId: string | null = null;
  try {
    const body = await request.clone().json().catch(() => null);
    if (body?.userId && typeof body.userId === "string") {
      bodyUserId = body.userId.trim();
    }
  } catch {
    /* ignore */
  }

  if (bodyUserId) {
    if (authId) {
      return authId === bodyUserId ? authId : null;
    }
    return null;
  }

  return authId;
}
