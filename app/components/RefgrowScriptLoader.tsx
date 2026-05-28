"use client";

/**
 * Charge le script Refgrow (parrainage / affiliation) uniquement après
 * accord explicite de l'utilisateur via la bannière de cookies.
 *
 * Sans consentement « affiliation », aucun script tiers Refgrow n'est
 * exécuté et aucun cookie n'est posé — conformément au RGPD et à la
 * directive ePrivacy.
 */

import Script from "next/script";
import { useEffect, useState } from "react";

import { getCookieConsent } from "./CookieConsentBanner";

interface Props {
  projectId: string;
}

export default function RefgrowScriptLoader({ projectId }: Props) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const consent = getCookieConsent();
      setAllowed(Boolean(consent?.affiliation));
    };
    sync();
    window.addEventListener("foodlane:cookie-consent-changed", sync);
    return () => {
      window.removeEventListener("foodlane:cookie-consent-changed", sync);
    };
  }, []);

  if (!allowed) return null;

  return (
    <Script
      src="https://scripts.refgrowcdn.com/latest.js"
      data-project-id={projectId}
      strategy="afterInteractive"
    />
  );
}
