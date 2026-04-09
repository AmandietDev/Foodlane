"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { plannerFetch } from "../src/lib/plannerClient";
import LoadingSpinner from "../components/LoadingSpinner";

export default function PlanifierPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSupabaseSession();
  const [checking, setChecking] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState("");

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const res = await plannerFetch("/preferences");
      const j = res.ok ? await res.json().catch(() => ({})) : {};
      if (cancelled) return;
      if (!j.completed) {
        router.replace("/onboarding");
        return;
      }
      const d = new Date();
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      setWeekStart(d.toISOString().slice(0, 10));
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await plannerFetch("/generate", {
        method: "POST",
        body: JSON.stringify({
          week_start_date: weekStart || undefined,
          use_ai_menu: true,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error || "Échec de la génération");
      }
      if (j.menu_id) {
        router.push(`/menus/${j.menu_id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setGenerating(false);
    }
  }

  if (sessionLoading || !user || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Chargement…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pt-6 pb-28">
      <div className="max-w-lg mx-auto space-y-6">
        <Link href="/tableau" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Générer un menu</h1>
        <div className="w-full overflow-hidden rounded-2xl border border-[var(--beige-border)] bg-white shadow-sm">
          <Image
            src="/menu-week-board-ae28d785.png"
            alt="Menu de la semaine sur tableau"
            width={1536}
            height={864}
            className="block w-full h-auto object-cover"
            sizes="(max-width: 768px) 100vw, 512px"
            priority={false}
          />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          On utilise tes préférences enregistrées (temps, équipements, régimes, allergies). Le menu est cohérent sur
          la période choisie, avec une liste de courses consolidée.
        </p>

        <label className="block text-sm text-[var(--text-primary)]">
          Semaine (lundi de début)
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-[var(--beige-border)] bg-white px-3 py-2 text-[var(--text-primary)]"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
          />
        </label>

        {error && (
          <div className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm border border-red-200">{error}</div>
        )}

        <button
          type="button"
          disabled={generating || !weekStart}
          onClick={generate}
          className="w-full rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white font-semibold py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "Génération en cours…" : "Lancer la génération"}
        </button>

        <p className="text-xs text-[var(--text-light)]">
          Pour ajuster les repas ou les contraintes avant de regénérer, modifie d’abord{" "}
          <Link href="/preferences" className="underline text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            tes préférences
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
