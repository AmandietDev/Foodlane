import { getSessionResilient } from "./supabaseClient";

export async function plannerAuthHeaders(): Promise<Record<string, string>> {
  const { session } = await getSessionResilient(8000);
  const t = session?.access_token;
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

/** Jeton Supabase (Bearer) pour toute route `/api` hors planner. */
export { plannerAuthHeaders as sessionAuthHeaders };

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

/** Erreurs réseau / serveur de dev qui redémarre : fetch rejette souvent un TypeError « Failed to fetch ». */
function isLikelyNetworkFailure(e: unknown): boolean {
  if (isAbortError(e)) return false;
  if (e instanceof TypeError) return true;
  if (e instanceof Error && /failed to fetch|networkerror|load failed/i.test(e.message)) {
    return true;
  }
  return false;
}

function networkFailureResponse(): Response {
  const error =
    "Impossible de joindre le serveur (connexion coupée ou serveur de dev en pause). Vérifie que la commande de développement tourne, ta connexion réseau, puis réessaie.";
  return new Response(JSON.stringify({ error }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Appel API planner authentifié. En cas d’échec réseau pur, retente une fois
 * (sauf POST pour éviter les doublons) puis renvoie une 503 JSON au lieu de
 * laisser rejeter une exception (évite les « Failed to fetch » non gérés).
 */
export async function plannerFetch(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  const allowRetry =
    method !== "POST" &&
    method !== "OPTIONS" &&
    method !== "CONNECT" &&
    method !== "TRACE";

  const run = async (auth: Record<string, string>) =>
    fetch(`/api/planner${path}`, {
      ...init,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...auth,
        ...(init?.headers as Record<string, string>),
      },
    });

  let auth = await plannerAuthHeaders();
  try {
    return await run(auth);
  } catch (e) {
    if (!allowRetry || !isLikelyNetworkFailure(e)) {
      return networkFailureResponse();
    }
    await new Promise((r) => setTimeout(r, 450));
    try {
      auth = await plannerAuthHeaders();
      return await run(auth);
    } catch {
      return networkFailureResponse();
    }
  }
}
