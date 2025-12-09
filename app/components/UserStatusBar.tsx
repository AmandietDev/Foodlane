/**
 * Barre d'état utilisateur affichée en haut de l'application
 * Affiche "Bonjour {prénom}" si connecté, ou bouton de connexion sinon
 */

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "./LoadingSpinner";
import { supabase } from "../src/lib/supabaseClient";

export default function UserStatusBar() {
  const router = useRouter();
  const { user, profile, loading } = useSupabaseSession();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("[UserStatusBar] Erreur lors de la déconnexion:", error);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-[#FFF0F0] border-b border-[#E8A0A0] px-4 py-2">
        <LoadingSpinner size="sm" message="" className="py-1" />
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FFF0F0] border-b border-[#E8A0A0] px-4 py-3 flex items-center justify-between">
      {user && profile ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#6B2E2E]">
              {profile.prenom ? `Bonjour ${profile.prenom}` : "Bonjour"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#D44A4A] hover:bg-[#C03A3A] rounded-lg transition-colors"
          >
            Se déconnecter
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="w-full text-center px-4 py-2 text-sm font-semibold text-white bg-[#D44A4A] hover:bg-[#C03A3A] rounded-lg transition-colors"
        >
          Se connecter / Créer un compte
        </Link>
      )}
    </div>
  );
}

