"use client";

import Script from "next/script";
import Link from "next/link";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "../components/LoadingSpinner";

const PROJECT_ID = process.env.NEXT_PUBLIC_REFGRROW_PROJECT_ID?.trim() || "";

/**
 * Tableau de bord affiliés Refgrow (mode pré-authentifié : email session Foodlane).
 * Le script latest.js (cookies ref) est déjà chargé dans le layout racine.
 */
export default function ParrainagePage() {
  const { user, loading } = useSupabaseSession();
  const email = user?.email?.trim() || "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F6]">
        <LoadingSpinner message="Chargement…" />
      </div>
    );
  }

  if (!user || !email) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FFF8F6] px-4">
        <p className="text-sm text-[#6B2E2E]">Connexion requise pour le programme parrainage.</p>
        <Link href="/login?next=/parrainage" className="text-sm font-semibold text-[#D44A4A] underline">
          Se connecter
        </Link>
      </div>
    );
  }

  if (!PROJECT_ID) {
    return (
      <main className="min-h-screen bg-[#FFF8F6] px-4 py-10 pb-28">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#E8A0A0] bg-white p-6 text-center text-[#6B2E2E]">
          <p className="font-semibold">Refgrow non configuré</p>
          <p className="mt-2 text-sm text-[#8A4A4A]">
            Ajoute <code className="text-xs">NEXT_PUBLIC_REFGRROW_PROJECT_ID</code> sur Vercel puis redéploie.
          </p>
          <Link href="/menu" className="mt-4 inline-block text-sm font-semibold text-[#D44A4A] underline">
            Retour
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8F6] px-4 py-8 pb-32 md:pb-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <Link href="/menu" className="text-sm font-medium text-[#8A4A4A] hover:text-[#6B2E2E]">
            ← Retour
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-[#4a2c2c]">Programme parrainage</h1>
          <p className="mt-2 text-sm text-[#6B2E2E]">
            Ton espace affilié Refgrow (lié à ton compte <strong className="font-medium">{email}</strong>). Les
            liens de parrainage utilisent le paramètre <code className="rounded bg-[#FFE8E8] px-1">ref</code> dans
            l’URL ; le cookie de suivi est posé par Refgrow sur 30 jours.
          </p>
          <p className="mt-2 text-sm text-[#6B2E2E]">
            Portail public alternatif :{" "}
            <a
              href="https://foodlane.refgrow.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#D44A4A] underline"
            >
              foodlane.refgrow.com
            </a>
          </p>
        </div>

        <div
          id="refgrow"
          className="min-h-[420px] w-full overflow-hidden rounded-2xl border border-[#E8A0A0] bg-white shadow-sm"
          data-project-id={PROJECT_ID}
          data-project-email={email}
        />

        <Script src="https://scripts.refgrowcdn.com/page.js" strategy="afterInteractive" />
      </div>
    </main>
  );
}
