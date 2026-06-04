"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "./TranslationProvider";
import { usePremium } from "../contexts/PremiumContext";
import { FreeTierAdSlot } from "./ads/FreeTierAdSlot";

const HIDDEN_PATH_PREFIXES = ["/", "/login", "/forgot-password", "/reset-password", "/coming-soon"];

function hideGlobalNav(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDDEN_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function menusTabActive(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/tableau" ||
    pathname.startsWith("/menus/") ||
    pathname === "/planifier" ||
    pathname === "/onboarding" ||
    pathname === "/menu-semaine"
  );
}

function recettesTabActive(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/recettes" ||
    pathname === "/favoris" ||
    pathname.startsWith("/favoris/") ||
    pathname === "/ressources" ||
    pathname.startsWith("/ressources/")
  );
}

function assistantTabActive(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/equilibre" || pathname.startsWith("/equilibre/");
}

function parametresTabActive(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/menu" ||
    pathname.startsWith("/menu/") ||
    pathname === "/compte" ||
    pathname === "/preferences" ||
    pathname.startsWith("/preferences/")
  );
}

export default function BottomNavigation() {
  const { isPremium, loading, canAccessDietAssistant } = usePremium();
  const { t } = useTranslation();
  const pathname = usePathname();

  if (hideGlobalNav(pathname)) {
    return null;
  }

  const linkClassMobile = (active: boolean) =>
    `flex flex-col items-center gap-1 py-2 px-2.5 min-w-[3.75rem] rounded-xl transition-all active:scale-[0.97] ${
      active ? "text-[#6B2E2E] bg-white/70" : "text-[#8A4A4A] hover:text-[#6B2E2E]"
    }`;

  const linkClassDesktop = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-[#FFD9D9] text-[#4a2c2c] border border-[#E8A0A0]"
        : "text-[#7A3A3A] hover:bg-[#FFF6F6] border border-transparent"
    }`;

  const showMobileAd = !loading && !isPremium;

  const desktopPremiumHint = !isPremium && (
    <div className="hidden md:block mt-auto p-3 border-t border-[#E8A0A0] bg-[var(--surface-muted)]">
      <Link
        href="/premium"
        className="flex items-center justify-center gap-2 rounded-lg bg-[var(--beige-accent)] text-white text-xs font-semibold py-2 px-2 hover:bg-[var(--beige-accent-hover)] transition-colors text-center"
      >
        Passer Premium
      </Link>
    </div>
  );

  return (
    <>
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 z-40 w-[var(--app-nav-rail-width)] h-dvh border-r border-[#E8A0A0] bg-[#FFF0F0] shadow-sm"
        aria-label="Navigation principale"
      >
        <div className="p-4 border-b border-[#E8D5D5]">
          <Link href="/tableau" className="font-bold text-[#4a2c2c] tracking-tight text-lg">
            Foodlane
          </Link>
          <p className="text-[11px] text-[#8A4A4A] mt-0.5 leading-snug">Menus, recettes &amp; conseils</p>
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
          <Link href="/tableau" className={linkClassDesktop(menusTabActive(pathname))}>
            <Image
              src="/moncarnet.png"
              alt=""
              width={22}
              height={22}
              className="object-contain shrink-0"
              unoptimized
            />
            <span>{t("nav.menus")}</span>
          </Link>
          <Link href="/recettes" className={linkClassDesktop(recettesTabActive(pathname))}>
            <Image src="/recettes.png" alt="" width={22} height={22} className="object-contain shrink-0" unoptimized />
            <span>{t("nav.recettes")}</span>
          </Link>
          <Link href="/equilibre" className={linkClassDesktop(assistantTabActive(pathname))}>
            <Image src="/repères.png" alt="" width={22} height={22} className="object-contain shrink-0" unoptimized />
            <span className="flex flex-wrap items-center gap-1">
              {t("nav.assistant")}
              {!isPremium && !canAccessDietAssistant && (
                <span className="px-1.5 py-0.5 bg-[#D44A4A] text-white text-[8px] font-bold rounded">PRO</span>
              )}
            </span>
          </Link>
          <Link href="/menu" className={linkClassDesktop(parametresTabActive(pathname))}>
            <Image src="/menu.png?v=2" alt="" width={22} height={22} className="object-contain shrink-0" unoptimized />
            <span>{t("nav.parametres")}</span>
          </Link>
        </nav>
        {desktopPremiumHint}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col md:hidden pb-[env(safe-area-inset-bottom,0px)]">
        {showMobileAd ? <FreeTierAdSlot placement="mobile_bottom" /> : null}
        <nav
          className="min-h-14 bg-[#FFF0F0]/95 backdrop-blur-md border-t border-[#E8A0A0] flex items-stretch justify-around text-[11px] leading-tight shadow-[0_-4px_20px_rgba(107,46,46,0.08)]"
          aria-label="Navigation principale"
        >
          <Link href="/tableau" className={`${linkClassMobile(menusTabActive(pathname))} flex-1`}>
            <Image
              src="/moncarnet.png"
              alt=""
              width={22}
              height={22}
              className="object-contain"
              unoptimized
            />
            <span className="text-center max-w-[4.5rem]">{t("nav.menus")}</span>
          </Link>
          <Link href="/recettes" className={`${linkClassMobile(recettesTabActive(pathname))} flex-1`}>
            <Image src="/recettes.png" alt="" width={22} height={22} className="object-contain" unoptimized />
            <span className="text-center max-w-[4.5rem]">{t("nav.recettes")}</span>
          </Link>
          <Link href="/equilibre" className={`${linkClassMobile(assistantTabActive(pathname))} flex-1`}>
            <Image src="/repères.png" alt="" width={22} height={22} className="object-contain" unoptimized />
            <span className="flex flex-col items-center gap-0.5 text-center max-w-[4.5rem]">
              <span className="flex items-center gap-1">
                {t("nav.assistant")}
                {!isPremium && !canAccessDietAssistant && (
                  <span className="px-1 py-0.5 bg-[#D44A4A] text-white text-[7px] font-bold rounded">PRO</span>
                )}
              </span>
            </span>
          </Link>
          <Link href="/menu" className={`${linkClassMobile(parametresTabActive(pathname))} flex-1`}>
            <Image src="/menu.png?v=2" alt="" width={22} height={22} className="object-contain" unoptimized />
            <span className="text-center max-w-[4.5rem]">{t("nav.parametres")}</span>
          </Link>
        </nav>
      </div>
    </>
  );
}
