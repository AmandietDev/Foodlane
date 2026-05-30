"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { plannerFetch } from "../src/lib/plannerClient";
import FavoritesRecipesHero from "../components/FavoritesRecipesHero";
import HomeRecipeSections from "../components/HomeRecipeSections";
import LoadingSpinner from "../components/LoadingSpinner";
import { FreeTierAdSlot } from "../components/ads/FreeTierAdSlot";
import { useTranslation } from "../components/TranslationProvider";

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message={t("preferences.page.loading")} />
      </div>
    );
  }

  if (prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message={t("dashboard.loading_space")} />
      </div>
    );
  }

  if (!onboardingDone) {
    router.replace("/onboarding");
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
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
    <div className="min-h-screen bg-[#FFF8F6] pb-28 pt-6 px-4 md:pt-10 md:px-8">
      <div className="max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto space-y-6 md:space-y-8">
        <header className="space-y-1">
          <h1 className="text-[2rem] leading-tight font-bold text-[#4a2c2c]">
            {t("dashboard.hello")}
            {firstName ? `, ${firstName}` : ""} !
          </h1>
          <p className="text-base text-[#7A3A3A] font-medium">{t("dashboard.subtitle")}</p>
        </header>

        <FreeTierAdSlot placement="tableau_inline" oncePerSession className="max-w-xl mx-auto" />

        <section className="rounded-3xl border border-[#E8A0A0] overflow-hidden shadow-sm bg-[#FFF1F1]">
          <div className="relative h-48 w-full bg-white">
            <Image
              src="/menu-generation-collage.png"
              alt=""
              fill
              className="object-cover object-center"
              sizes="(max-width: 512px) 100vw, 512px"
              priority
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#2a1515]/92 via-[#2a1515]/60 to-transparent"
              aria-hidden
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-12">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/85 mb-1">
                {t("dashboard.card.planning")}
              </p>
              <h3 className="text-[1.65rem] leading-tight font-bold text-white drop-shadow-md">
                {t("dashboard.card.gen_title")}
              </h3>
              <p className="text-sm text-white mt-1.5 leading-snug max-w-[300px] drop-shadow-sm">
                {t("dashboard.card.gen_desc")}
              </p>
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/preferences"
                className="inline-flex items-center rounded-full border border-[#E8A0A0] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B2E2E]"
              >
                {t("dashboard.prefs_link")}
              </Link>
              <Link
                href="#mon-carnet-menus"
                className="inline-flex items-center rounded-full border border-[#E8A0A0] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B2E2E] hover:bg-[#fff8f8] transition-colors"
              >
                {t("dashboard.carnet_link")}
              </Link>
              <Link
                href="/favoris"
                className="inline-flex items-center rounded-full border border-[#E8A0A0] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B2E2E] hover:bg-[#fff8f8] transition-colors"
                aria-label={t("dashboard.aria_favorites")}
              >
                {t("dashboard.favorites_link")}
              </Link>
            </div>
            <Link
              href="/planifier"
              className="mt-4 block w-full rounded-2xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white text-center font-semibold py-3.5 transition-colors"
            >
              {t("dashboard.cta_generate")}
            </Link>
          </div>
        </section>

        <HomeRecipeSections />

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/preferences"
            className="block rounded-2xl border border-[#E8A0A0] overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white text-center"
            aria-label={t("dashboard.aria_prefs_card")}
          >
            <div className="relative h-36 w-full bg-white sm:h-40">
              <Image
                src="/preferences-banner-35386307.png"
                alt=""
                fill
                className="object-contain object-center p-2"
                sizes="(max-width: 512px) 50vw, 256px"
                priority={false}
              />
            </div>
            <div className="p-4 border-t border-[#F0E0E0]">
              <span className="text-lg block mb-1" aria-hidden>
                ⚙️
              </span>
              <div className="font-semibold text-[#4a2c2c]">{t("dashboard.prefs_card_title")}</div>
              <p className="text-xs text-[#7a5a5a] mt-1">{t("dashboard.prefs_card_desc")}</p>
            </div>
          </Link>
        <FavoritesRecipesHero className="w-full" />
        </div>

        <Link
          href="/recettes"
          className="block rounded-2xl border border-[#E8A0A0] overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
          aria-label={t("dashboard.aria_recipes_card")}
        >
          <div className="relative min-h-[14rem] h-64 w-full bg-white sm:min-h-[15rem] sm:h-72">
            <Image
              src="/recipes-explore-banner-229d46d1.png"
              alt=""
              fill
              className="object-contain object-center p-2"
              sizes="(max-width: 512px) 100vw, 512px"
              priority={false}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#2a1515]/95 via-[#2a1515]/72 to-transparent"
              aria-hidden
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-12">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/90 mb-1">
                {t("dashboard.recipes_kicker")}
              </p>
              <h3 className="text-[1.65rem] leading-tight font-bold text-white drop-shadow-md">
                {t("dashboard.recipes_title")}
              </h3>
              <p className="text-sm text-white mt-1.5 leading-snug max-w-[300px] drop-shadow-sm">
                {t("dashboard.recipes_desc")}
              </p>
            </div>
          </div>
        </Link>

        <section id="mon-carnet-menus" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[#4a2c2c] mb-1">{t("dashboard.carnet_section_title")}</h2>
          <p className="text-xs text-[#7a5a5a] mb-3">{t("dashboard.carnet_section_hint")}</p>
          {menusLoading ? (
            <p className="text-sm text-[#7a5a5a]">{t("dashboard.carnet_loading")}</p>
          ) : menus.length === 0 ? (
            <p className="text-sm text-[#7a5a5a] rounded-xl border border-dashed border-[#E8A0A0] p-6 text-center">
              {t("dashboard.carnet_empty")}
            </p>
          ) : (
            <ul className="space-y-2">
              {menus.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/menus/${m.id}`}
                    className="flex justify-between items-center rounded-xl border border-[#E8D5D5] bg-white px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-[#4a2c2c]">{m.title}</span>
                    <span className="text-[#9a7a7a]">{t("dashboard.carnet_view")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
