"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { plannerFetch } from "../src/lib/plannerClient";
import LoadingSpinner from "../components/LoadingSpinner";
import { HomeDashboard } from "../components/home/HomeDashboard";
import { useTranslation } from "../components/TranslationProvider";
import { usePremium } from "../contexts/PremiumContext";

type MenuRow = {
  id: string;
  title: string;
  week_start_date: string;
  planning_days: number;
  created_at: string;
};

export default function TableauPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, loading: sessionLoading } = useSupabaseSession();
  const { isPremium, loading: premiumLoading } = usePremium();
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setPrefsLoading(true);
      const res = await plannerFetch("/preferences");
      const j = res.ok ? await res.json().catch(() => ({})) : {};
      if (!cancelled) {
        setOnboardingDone(Boolean(j.completed));
        setPrefsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !onboardingDone) return;
    let cancelled = false;
    (async () => {
      setMenusLoading(true);
      const res = await plannerFetch("/menus?saved_only=1");
      const j = await res.json().catch(() => ({}));
      if (!cancelled) {
        setMenus(Array.isArray(j.menus) ? j.menus : []);
        setMenusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, onboardingDone]);

  if (sessionLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF9F5]">
        <LoadingSpinner message={t("preferences.page.loading")} />
      </div>
    );
  }

  if (prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF9F5]">
        <LoadingSpinner message={t("dashboard.loading_space")} />
      </div>
    );
  }

  if (!onboardingDone) {
    router.replace("/onboarding");
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF9F5]">
        <LoadingSpinner message={t("dashboard.redirect_onboarding")} />
      </div>
    );
  }

  const firstName =
    user.user_metadata?.first_name ||
    user.user_metadata?.prenom ||
    user.email?.split("@")[0] ||
    "";

  return (
    <HomeDashboard
      firstName={firstName}
      menus={menus}
      menusLoading={menusLoading}
      showAd={!premiumLoading && !isPremium}
    />
  );
}
