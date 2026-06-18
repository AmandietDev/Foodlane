"use client";

import { useEffect, useState } from "react";

import { getCookieConsent } from "../CookieConsentBanner";
import { usePremium } from "../../contexts/PremiumContext";
import AdsenseScript from "./AdsenseScript";
import { getAdsensePublisherId } from "../../src/lib/adsConfig";

/** Charge le script AdSense uniquement pour les utilisateurs non Premium ayant accepté les cookies marketing. */
export default function AdsenseLoader() {
  const { isPremium, loading } = usePremium();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const sync = () => {
      if (!mounted) return;
      const consent = getCookieConsent();
      setAllowed(Boolean(consent?.marketing));
    };

    sync();
    window.addEventListener("foodlane:cookie-consent-changed", sync);
    return () => {
      mounted = false;
      window.removeEventListener("foodlane:cookie-consent-changed", sync);
    };
  }, []);

  if (loading || isPremium) return null;
  if (!getAdsensePublisherId()) return null;
  if (!allowed) return null;
  return <AdsenseScript />;
}
