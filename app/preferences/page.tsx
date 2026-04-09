"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { plannerFetch } from "../src/lib/plannerClient";
import { DEFAULT_PLANNER_PREFERENCES } from "../src/lib/weeklyPlanner";
import type { PlannerPreferences } from "../src/lib/weeklyPlanner";
import PlannerProfileForm from "../components/PlannerProfileForm";
import LoadingSpinner from "../components/LoadingSpinner";

export default function PreferencesPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSupabaseSession();
  const [initial, setInitial] = useState<PlannerPreferences>(DEFAULT_PLANNER_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

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
      if (j.preferences) setInitial(j.preferences as PlannerPreferences);
      if (!j.completed) {
        router.replace("/onboarding");
        return;
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  if (sessionLoading || !user || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F6]">
        <LoadingSpinner message="Chargement…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F6] pt-6 px-4 pb-8">
      <div className="max-w-2xl mx-auto flex items-center justify-between mb-4">
        <Link href="/tableau" className="text-sm text-[#8A4A4A]">
          ← Retour
        </Link>
      </div>
      <div className="max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-[#4a2c2c]">Mes préférences</h1>
        {saved && (
          <p className="text-sm text-green-700 mt-2">Modifications enregistrées.</p>
        )}
      </div>
      <PlannerProfileForm
        key={user.id}
        initial={initial}
        submitLabel="Mettre à jour"
        onSubmit={async ({ preferences, equipment_keys, allergy_keys, excluded_ingredients }) => {
          const res = await plannerFetch("/preferences", {
            method: "PUT",
            body: JSON.stringify({
              preferences,
              equipment_keys,
              allergy_keys,
              excluded_ingredients,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Erreur");
          }
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        }}
      />
    </div>
  );
}
