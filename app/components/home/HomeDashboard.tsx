"use client";

import { FreeTierAdSlot } from "../ads/FreeTierAdSlot";
import { HomeAssistantCard } from "./HomeAssistantCard";
import { HomeHeader } from "./HomeHeader";
import { HomeMenuHeroCard } from "./HomeMenuHeroCard";
import { HomeQuickActions } from "./HomeQuickActions";
import { HomeSuggestionsCarousel } from "./HomeSuggestionsCarousel";
import { HomeWeekSection } from "./HomeWeekSection";
import { homeTheme } from "./homeTheme";

type MenuRow = {
  id: string;
  title: string;
  week_start_date: string;
};

type HomeDashboardProps = {
  firstName: string;
  menus: MenuRow[];
  menusLoading: boolean;
  showAd: boolean;
};

export function HomeDashboard({
  firstName,
  menus,
  menusLoading,
  showAd,
}: HomeDashboardProps) {
  return (
    <div
      className="min-h-screen pt-5 px-4 pb-2 md:pt-8 md:px-6 md:pb-4"
      style={{ backgroundColor: homeTheme.pageBg }}
    >
      <div className="mx-auto max-w-md space-y-5 md:max-w-lg">
        <HomeHeader firstName={firstName} />
        <HomeMenuHeroCard />
        <HomeQuickActions />
        <HomeWeekSection menus={menus} loading={menusLoading} />
        <HomeSuggestionsCarousel />
        <HomeAssistantCard />
        {showAd ? <FreeTierAdSlot placement="tableau_inline" oncePerSession /> : null}
      </div>
    </div>
  );
}
