"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "./TranslationProvider";
import { usePremium } from "../contexts/PremiumContext";

export default function BottomNavigation() {
  const { isPremium } = usePremium();
  const { t } = useTranslation();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed inset-x-0 bottom-0 flex flex-col">
      {/* Barre d'onglets */}
      <nav className="h-14 bg-[#FFF0F0] border-t border-[#E8A0A0] flex items-center justify-around text-xs shadow-lg">
        <Link 
          href="/" 
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
            isActive("/") ? "text-[#6B2E2E]" : "text-[#8A4A4A] hover:text-[#6B2E2E]"
          }`}
        >
          <Image
            src="/recettes.png"
            alt="Recettes"
            width={24}
            height={24}
            className="object-contain"
            unoptimized
          />
          <span>{t("nav.cuisine")}</span>
        </Link>
        <Link 
          href="/favoris" 
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
            isActive("/favoris") || isActive("/ressources") ? "text-[#6B2E2E]" : "text-[#8A4A4A] hover:text-[#6B2E2E]"
          }`}
        >
          <Image
            src="/moncarnet.png"
            alt="Mes recettes"
            width={24}
            height={24}
            className="object-contain"
            unoptimized
          />
          <span>{t("nav.ressources")}</span>
        </Link>
        <Link 
          href="/equilibre" 
          className={`relative flex flex-col items-center gap-1 py-1 px-2 transition-all ${
            isActive("/equilibre") ? "text-[#6B2E2E]" : "text-[#8A4A4A] hover:text-[#6B2E2E]"
          }`}
        >
          <Image
            src="/repères.png"
            alt="Mon suivi"
            width={24}
            height={24}
            className="object-contain"
            unoptimized
          />
          <span className="flex items-center gap-1">
            {t("nav.equilibre")}
            {!isPremium && (
              <span className="px-1.5 py-0.5 bg-[#D44A4A] text-white text-[8px] font-bold rounded">
                PREMIUM
              </span>
            )}
          </span>
        </Link>
        <Link 
          href="/menu" 
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
            isActive("/menu") || isActive("/compte") ? "text-[#6B2E2E]" : "text-[#8A4A4A] hover:text-[#6B2E2E]"
          }`}
        >
          <Image
            src="/menu.png?v=2"
            alt="Menu"
            width={24}
            height={24}
            className="object-contain"
            unoptimized
          />
          <span>{t("nav.menu")}</span>
        </Link>
      </nav>

      {/* Bandeau pub sous les onglets - masqué si premium */}
      {!isPremium && (
        <div className="h-10 bg-[var(--beige-card-alt)] border-t border-[var(--beige-border)] flex items-center justify-between px-4 text-xs">
          <span className="text-[var(--beige-text-light)]">Espace publicité</span>
          <Link
            href="/premium"
            className="px-3 py-1 rounded-lg bg-[var(--beige-accent)] text-white text-xs font-semibold hover:bg-[var(--beige-accent-hover)] transition-colors"
          >
            Arrêter les pubs
          </Link>
        </div>
      )}
    </div>
  );
}

