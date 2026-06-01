"use client";

import { usePremium } from "../../contexts/PremiumContext";
import AdsenseScript from "./AdsenseScript";
import { getAdsensePublisherId } from "../../src/lib/adsConfig";

/** Charge le script AdSense uniquement pour les utilisateurs non Premium. */
export default function AdsenseLoader() {
  const { isPremium, loading } = usePremium();
  if (loading || isPremium) return null;
  if (!getAdsensePublisherId()) return null;
  return <AdsenseScript />;
}
