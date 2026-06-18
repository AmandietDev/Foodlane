"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type MenuTab = "compte" | "parametres" | "notifications" | "foyer" | "contact" | "abonnement";

export type MenuSectionId = "profil" | "confidentialite" | "apropos" | "legales";

const VALID_TABS = new Set<string>([
  "compte",
  "parametres",
  "notifications",
  "foyer",
  "contact",
  "abonnement",
]);

const VALID_SECTIONS = new Set<string>(["profil", "confidentialite", "apropos", "legales"]);

export function useMenuNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabRaw = searchParams.get("tab");
  const sectionRaw = searchParams.get("section");

  const activeTab = tabRaw && VALID_TABS.has(tabRaw) ? (tabRaw as MenuTab) : null;
  const activeSection =
    sectionRaw && VALID_SECTIONS.has(sectionRaw) ? (sectionRaw as MenuSectionId) : null;

  const isHub = !activeTab && !activeSection;

  const openTab = useCallback(
    (tab: MenuTab) => {
      router.push(`/menu?tab=${encodeURIComponent(tab)}`, { scroll: false });
    },
    [router]
  );

  const openSection = useCallback(
    (section: MenuSectionId) => {
      router.push(`/menu?section=${encodeURIComponent(section)}`, { scroll: false });
    },
    [router]
  );

  const openProfilSection = useCallback(() => {
    router.push("/menu?tab=compte&section=profil", { scroll: false });
  }, [router]);

  const backToHub = useCallback(() => {
    router.replace("/menu", { scroll: false });
  }, [router]);

  const backOneLevel = useCallback(() => {
    if (activeSection && activeTab) {
      router.replace(`/menu?tab=${encodeURIComponent(activeTab)}`, { scroll: false });
      return;
    }
    backToHub();
  }, [activeSection, activeTab, backToHub, router]);

  return {
    activeTab,
    activeSection,
    isHub,
    openTab,
    openSection,
    openProfilSection,
    backToHub,
    backOneLevel,
  };
}
