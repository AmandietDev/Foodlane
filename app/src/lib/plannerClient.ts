import { getSessionResilient } from "./supabaseClient";

export async function plannerAuthHeaders(): Promise<Record<string, string>> {
  const { session } = await getSessionResilient(8000);
  const t = session?.access_token;
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

export async function plannerFetch(path: string, init?: RequestInit): Promise<Response> {
  const auth = await plannerAuthHeaders();
  return fetch(`/api/planner${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...(init?.headers as Record<string, string>),
    },
  });
}
