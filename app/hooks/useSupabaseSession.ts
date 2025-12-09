/**
 * Hook réutilisable pour gérer la session Supabase
 * Centralise la logique d'authentification
 */

import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  prenom: string | null;
  full_name: string | null;
}

export interface SessionState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook pour récupérer la session Supabase et le profil utilisateur
 * @returns {SessionState} État de la session avec user, profile, loading et error
 */
export function useSupabaseSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        // Vérifier que Supabase est configuré
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          console.warn("[useSupabaseSession] Supabase non configuré, mode déconnecté");
          if (!mounted) return;
          setState({
            user: null,
            profile: null,
            loading: false,
            error: null,
          });
          return;
        }

        // Récupérer la session avec un timeout de 2 secondes (réduit pour être plus réactif)
        let sessionResult;
        try {
          sessionResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise<{ data: { session: null }, error: { message: string } }>((_, reject) => 
              setTimeout(() => reject(new Error("Timeout Supabase - pas de réponse en 2 secondes")), 2000)
            )
          ]);
        } catch (timeoutError) {
          // Timeout ou erreur réseau
          if (!mounted) return;
          console.warn("[useSupabaseSession] Timeout ou erreur réseau, mode déconnecté:", timeoutError);
          setState({
            user: null,
            profile: null,
            loading: false,
            error: null,
          });
          return;
        }

        const { data: { session }, error: sessionError } = sessionResult;

        if (sessionError) {
          console.error("[useSupabaseSession] Erreur getSession:", sessionError);
          // Ne pas throw, juste logger et continuer en mode déconnecté
          if (!mounted) return;
          setState({
            user: null,
            profile: null,
            loading: false,
            error: null,
          });
          return;
        }

        if (!mounted) return;

        if (!session?.user) {
          setState({
            user: null,
            profile: null,
            loading: false,
            error: null,
          });
          return;
        }

        // Récupérer le profil depuis la table profiles avec timeout
        let profile = null;
        try {
          // Timeout de 2 secondes pour la requête du profil (non bloquant)
          const profilePromise = supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", session.user.id)
            .single();

          const profileResult = await Promise.race([
            profilePromise,
            new Promise<{ data: null; error: { code: string; message: string } }>((resolve) =>
              setTimeout(() => resolve({ data: null, error: { code: "TIMEOUT", message: "Timeout" } }), 2000)
            ),
          ]);

          const { data, error: profileError } = profileResult;

          if (profileError) {
            if (profileError.code === "PGRST116") {
              // PGRST116 = pas de ligne trouvée (normal si le profil n'existe pas encore)
              // On continue sans profil
            } else if (profileError.code === "TIMEOUT") {
              // Timeout - on continue sans profil pour ne pas bloquer
              console.warn("[useSupabaseSession] Timeout lors du chargement du profil, continuation sans profil");
            } else {
              console.error("[useSupabaseSession] Erreur lors du chargement du profil:", profileError);
            }
          } else {
            profile = data;
          }
        } catch (profileErr) {
          console.error("[useSupabaseSession] Erreur lors de la récupération du profil:", profileErr);
          // Continuer sans profil si erreur
        }

        // Extraire le prénom du full_name
        const prenom = profile?.full_name?.split(" ")[0] || null;

        setState({
          user: session.user,
          profile: profile
            ? {
                id: profile.id,
                email: session.user.email || "",
                prenom,
                full_name: profile.full_name,
              }
            : {
                id: session.user.id,
                email: session.user.email || "",
                prenom: session.user.user_metadata?.prenom || null,
                full_name: session.user.user_metadata?.prenom
                  ? `${session.user.user_metadata.prenom} ${session.user.user_metadata.nom || ""}`.trim()
                  : null,
              },
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;
        console.error("[useSupabaseSession] Erreur:", error);
        setState({
          user: null,
          profile: null,
          loading: false,
          error: error instanceof Error ? error : new Error("Erreur inconnue"),
        });
      }
    }

    loadSession();

    // Écouter les changements d'authentification
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          // Recharger le profil quand la session change (avec timeout)
          let profile = null;
          try {
            const profilePromise = supabase
              .from("profiles")
              .select("id, full_name")
              .eq("id", session.user.id)
              .single();

            const profileResult = await Promise.race([
              profilePromise,
              new Promise<{ data: null; error: { code: string } }>((resolve) =>
                setTimeout(() => resolve({ data: null, error: { code: "TIMEOUT" } }), 2000)
              ),
            ]);

            if (!profileResult.error || profileResult.error.code === "PGRST116") {
              profile = profileResult.data;
            }
          } catch (err) {
            // Ignorer les erreurs de profil
          }

          const prenom = profile?.full_name?.split(" ")[0] || null;

          setState({
            user: session.user,
            profile: profile
              ? {
                  id: profile.id,
                  email: session.user.email || "",
                  prenom,
                  full_name: profile.full_name,
                }
              : {
                  id: session.user.id,
                  email: session.user.email || "",
                  prenom: session.user.user_metadata?.prenom || null,
                  full_name: session.user.user_metadata?.prenom
                    ? `${session.user.user_metadata.prenom} ${session.user.user_metadata.nom || ""}`.trim()
                    : null,
                },
            loading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            profile: null,
            loading: false,
            error: null,
          });
        }
      });
      subscription = sub;
    } catch (err) {
      console.error("[useSupabaseSession] Erreur lors de la création du listener:", err);
      // Si on ne peut pas créer le listener, on continue quand même
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return state;
}

