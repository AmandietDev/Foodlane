"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { plannerFetch } from "../src/lib/plannerClient";
import { DEFAULT_PLANNER_PREFERENCES } from "../src/lib/weeklyPlanner";
import type { PlannerPreferences } from "../src/lib/weeklyPlanner";
import PlannerProfileForm from "../components/PlannerProfileForm";
import LoadingSpinner from "../components/LoadingSpinner";
import { useTranslation } from "../components/TranslationProvider";
import { MobileAppScreen } from "../components/app/MobileAppScreen";
import { appLayoutTheme } from "../components/app/appLayoutTheme";

export default function PreferencesPage() {
  const { t } = useTranslation();
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
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: appLayoutTheme.pageBg }}
      >
        <LoadingSpinner message={t("preferences.page.loading")} />
      </div>
    );
  }

  return (
    <MobileAppScreen
      title={t("preferences.page.title")}
      subtitle="Régimes, allergies, équipements et objectifs"
      backHref="/menu"
      contentClassName="px-4 pt-2 pb-8 space-y-4"
    >
      {saved ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("preferences.page.saved")}
        </p>
      ) : null}
      <PlannerProfileForm
        key={user.id}
        initial={initial}
        visualVariant="foyer"
        submitLabel={t("preferences.submit.update")}
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
    </MobileAppScreen>
  );
}
