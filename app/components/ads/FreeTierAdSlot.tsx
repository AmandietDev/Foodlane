"use client";

/**
 * Emplacement Google AdSense — affiché uniquement pour les utilisateurs non payants
 * (après chargement du profil Premium, pour éviter un flash de pub).
 *
 * Réglages : voir `.env.example` (NEXT_PUBLIC_ADSENSE_*).
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePremium } from "../../contexts/PremiumContext";
import { getAdsensePublisherId, getAdsenseSlot, type AdPlacement } from "../../src/lib/adsConfig";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

function loadAdsenseScript(clientId: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (document.querySelector('script[data-foodlane-adsense="1"]')) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
    s.crossOrigin = "anonymous";
    s.dataset.foodlaneAdsense = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("AdSense"));
    document.head.appendChild(s);
  });
}

type Props = {
  placement: AdPlacement;
  className?: string;
  /** Une seule impression par session navigateur (recommandé pour un 2e emplacement). */
  oncePerSession?: boolean;
};

export function FreeTierAdSlot({ placement, className = "", oncePerSession = false }: Props) {
  const { isPremium, loading } = usePremium();
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const [error, setError] = useState(false);

  const publisherId = getAdsensePublisherId();
  const slotId = getAdsenseSlot(placement);
  const configured = Boolean(publisherId && slotId);

  const sessionBlockKey = `foodlane_ad_block_${placement}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading || isPremium || !configured || !publisherId || !slotId) return;
    if (oncePerSession && sessionStorage.getItem(sessionBlockKey)) return;
    if (pushedRef.current) return;

    const el = insRef.current;
    if (!el) return;

    let cancelled = false;

    void (async () => {
      try {
        await loadAdsenseScript(publisherId);
        if (cancelled || !insRef.current || pushedRef.current) return;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushedRef.current = true;
        if (oncePerSession) sessionStorage.setItem(sessionBlockKey, "1");
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, isPremium, configured, publisherId, slotId, placement, oncePerSession, sessionBlockKey]);

  if (loading) return null;
  if (isPremium) return null;
  if (oncePerSession && typeof window !== "undefined" && sessionStorage.getItem(sessionBlockKey)) {
    return null;
  }

  if (!configured || error) {
    if (placement !== "mobile_bottom") return null;
    return (
      <div
        className={`flex items-center justify-between gap-2 border-t border-[#E8A0A0] bg-[#FFF8F6] px-3 py-2 text-xs md:hidden ${className}`}
      >
        <span className="text-[#8A4A4A] truncate">Espace pub — AdSense : voir .env.example</span>
        <Link
          href="/premium"
          className="shrink-0 rounded-lg bg-[#D44A4A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#C03A3A] transition-colors"
        >
          Passer Premium
        </Link>
      </div>
    );
  }

  if (placement === "mobile_bottom") {
    return (
      <div className={`md:hidden border-t border-[#E8A0A0] bg-[#FFF8F6] ${className}`}>
        <div className="flex min-h-[52px] max-h-[120px] items-center justify-center overflow-hidden px-1">
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: "block", width: "100%", maxWidth: "100%" }}
            data-ad-client={publisherId}
            data-ad-slot={slotId}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#F0E0E0] px-3 py-1.5 text-[11px] text-[#8A4A4A]">
          <span className="truncate">Publicité</span>
          <Link href="/premium" className="shrink-0 font-semibold text-[#D44A4A] underline-offset-2 hover:underline">
            Retirer les pubs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-[#E8D5D5] bg-white/90 p-2 overflow-hidden ${className}`}>
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-[#9a7a7a]">Publicité</p>
      <div className="flex min-h-[90px] max-h-[280px] items-center justify-center overflow-hidden">
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block", width: "100%", maxWidth: "100%" }}
          data-ad-client={publisherId}
          data-ad-slot={slotId}
          data-ad-format="rectangle"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
