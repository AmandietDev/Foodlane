import Link from "next/link";
import { getSessionUserFromCookies } from "../src/lib/supabaseServer";
import { isEmailAllowedAffiliateDashboard } from "../src/lib/affiliateDashboardAllowlist";
import ParrainageRefgrowWidget from "./ParrainageRefgrowWidget";

/**
 * Tableau de bord affilié Refgrow (pré-auth) : uniquement pour les emails listés
 * dans AFFILIATE_DASHBOARD_EMAILS (Vercel / .env.local). Les influenceurs invités
 * dans Refgrow utilisent surtout le portail https://foodlane.refgrow.com.
 */
export default async function ParrainagePage() {
  const user = await getSessionUserFromCookies();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FFF8F6] px-4">
        <p className="text-sm text-[#6B2E2E]">Connexion requise.</p>
        <Link href="/login?next=/parrainage" className="text-sm font-semibold text-[#E94E77] underline">
          Se connecter
        </Link>
      </div>
    );
  }

  if (!isEmailAllowedAffiliateDashboard(user.email)) {
    return (
      <main className="min-h-screen bg-[#FFF8F6] px-4 py-10 pb-28">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#E8D5D5] bg-white p-6 text-center text-[#6B2E2E]">
          <p className="font-semibold">Accès non disponible</p>
          <p className="mt-2 text-sm text-[#8A4A4A]">
            Cette section est réservée. Le suivi des campagnes partenaires est géré avec Foodlane&nbsp;; les
            utilisateurs de l&apos;app n&apos;y ont pas accès ici.
          </p>
          <Link href="/menu" className="mt-4 inline-block text-sm font-semibold text-[#E94E77] underline">
            Retour
          </Link>
        </div>
      </main>
    );
  }

  const projectId = process.env.NEXT_PUBLIC_REFGRROW_PROJECT_ID?.trim() || "";

  if (!projectId) {
    return (
      <main className="min-h-screen bg-[#FFF8F6] px-4 py-10 pb-28">
        <div className="mx-auto max-w-lg rounded-2xl border border-[var(--beige-border)] bg-white p-6 text-center text-[#6B2E2E]">
          <p className="font-semibold">Refgrow non configuré</p>
          <p className="mt-2 text-sm text-[#8A4A4A]">
            Ajoute <code className="text-xs">NEXT_PUBLIC_REFGRROW_PROJECT_ID</code> sur Vercel puis redéploie.
          </p>
          <Link href="/menu" className="mt-4 inline-block text-sm font-semibold text-[#E94E77] underline">
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
          <h1 className="mt-3 text-2xl font-bold text-[#4a2c2c]">Programme partenaires (interne)</h1>
          <p className="mt-2 text-sm text-[#6B2E2E]">
            Espace Refgrow lié au compte <strong className="font-medium">{user.email}</strong>. Les liens
            utilisent le paramètre <code className="rounded bg-[#FFE8E8] px-1">ref</code> dans l&apos;URL ; le
            cookie de suivi est posé par Refgrow (30 jours). Les influenceurs peuvent aussi utiliser le portail
            public.
          </p>
          <p className="mt-2 text-sm text-[#6B2E2E]">
            Portail affiliés :{" "}
            <a
              href="https://foodlane.refgrow.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#E94E77] underline"
            >
              foodlane.refgrow.com
            </a>
          </p>
        </div>

        <ParrainageRefgrowWidget email={user.email} projectId={projectId} />
      </div>
    </main>
  );
}
