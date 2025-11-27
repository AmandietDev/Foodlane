"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { loadPreferences } from "../src/lib/userPreferences";
import { useTranslation } from "./TranslationProvider";

export default function BottomNavigation() {
  const [isPremium, setIsPremium] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const checkPremium = () => {
      const preferences = loadPreferences();
      setIsPremium(preferences.abonnementType === "premium");
    };

    // Vérifier au montage
    checkPremium();

    // Écouter les changements de localStorage
    const handleStorageChange = () => {
      checkPremium();
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Écouter les changements personnalisés (quand les préférences changent dans la même page)
    const interval = setInterval(checkPremium, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

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
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
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
          <span>{t("nav.equilibre")}</span>
        </Link>
        <Link 
          href="/menu" 
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
            isActive("/menu") ? "text-[#6B2E2E]" : "text-[#8A4A4A] hover:text-[#6B2E2E]"
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
      {/* Ne rendre que côté client pour éviter les erreurs d'hydratation */}
      {mounted && !isPremium && (
        <div className="h-10 bg-[var(--beige-card-alt)] border-t border-[var(--beige-border)] flex items-center justify-center text-xs text-[var(--beige-text-light)]">
          Espace publicité (bandeau fixe)
        </div>
      )}
    </div>
  );
}

