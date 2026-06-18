"use client";

/**
 * Bannière de consentement aux cookies — Foodlane.
 *
 * - Affichage automatique tant que l'utilisateur n'a pas exprimé de choix
 *   (ou que son consentement précédent a expiré, durée CNIL = 13 mois).
 * - 3 actions au même niveau visuel (CNIL) :
 *     « Tout accepter », « Tout refuser », « Personnaliser ».
 * - Choix stocké dans localStorage (sans serveur, sans cookie tiers).
 * - Réouvrable depuis la politique cookies via l'event
 *   `foodlane:cookie-consent-open` (cf. openCookieConsentBanner()).
 *
 * Pour lire le consentement avant de charger un script tiers :
 *
 *     import { getCookieConsent } from "@/app/components/CookieConsentBanner";
 *     const consent = getCookieConsent();
 *     if (consent?.audience) { /* charger l'outil analytics ... *\/ }
 */

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "foodlane_cookie_consent_v1";
/** Durée de validité du consentement (CNIL recommande 13 mois maximum). */
const CONSENT_DURATION_DAYS = 395;

export type CookieCategory =
  | "essential"
  | "audience"
  | "marketing"
  | "affiliation";

export interface CookieConsent {
  /** Toujours `true` : strictement nécessaires au fonctionnement. */
  essential: true;
  /** Mesure d'audience anonymisée (Vercel Analytics, Plausible, etc.). */
  audience: boolean;
  /** Pixels marketing / publicité (Meta, TikTok, Google Ads, etc.). */
  marketing: boolean;
  /** Parrainage / affiliation (Refgrow). */
  affiliation: boolean;
  /** Date ISO d'expression du consentement. */
  acceptedAt: string;
  /** Date ISO d'expiration. */
  expiresAt: string;
}

/* ============================================================
 * API publique (lecture / réouverture / réinitialisation)
 * ============================================================ */

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getCookieConsent(): CookieConsent | null {
  if (!isClient()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (!parsed?.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Ouvre la bannière (à appeler depuis la politique cookies). */
export function openCookieConsentBanner(): void {
  if (!isClient()) return;
  window.dispatchEvent(new CustomEvent("foodlane:cookie-consent-open"));
}

/** Efface le consentement enregistré et réouvre la bannière. */
export function resetCookieConsent(): void {
  if (!isClient()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("foodlane:cookie-consent-changed"));
  openCookieConsentBanner();
}

/* ============================================================
 * Composant
 * ============================================================ */

type CustomPrefs = {
  audience: boolean;
  marketing: boolean;
  affiliation: boolean;
};

const DEFAULT_PREFS: CustomPrefs = {
  audience: false,
  marketing: false,
  affiliation: false,
};

export default function CookieConsentBanner() {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CustomPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    const existing = getCookieConsent();
    if (existing) {
      setPrefs({
        audience: existing.audience,
        marketing: existing.marketing,
        affiliation: existing.affiliation,
      });
    } else {
      setOpen(true);
    }

    const handleOpen = () => {
      const c = getCookieConsent();
      if (c) {
        setPrefs({
          audience: c.audience,
          marketing: c.marketing,
          affiliation: c.affiliation,
        });
      } else {
        setPrefs(DEFAULT_PREFS);
      }
      setCustomize(true);
      setOpen(true);
    };

    window.addEventListener("foodlane:cookie-consent-open", handleOpen);
    return () => {
      window.removeEventListener("foodlane:cookie-consent-open", handleOpen);
    };
  }, []);

  const persist = (p: CustomPrefs) => {
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(now.getDate() + CONSENT_DURATION_DAYS);
    const consent: CookieConsent = {
      essential: true,
      audience: p.audience,
      marketing: p.marketing,
      affiliation: p.affiliation,
      acceptedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
      window.dispatchEvent(
        new CustomEvent("foodlane:cookie-consent-changed", {
          detail: consent,
        })
      );
    } catch {
      // localStorage indisponible (mode privé strict) : on ignore silencieusement.
    }
    setPrefs(p);
    setCustomize(false);
    setOpen(false);
  };

  if (!open) return null;

  const acceptAll = () =>
    persist({ audience: true, marketing: true, affiliation: true });
  const refuseAll = () =>
    persist({ audience: false, marketing: false, affiliation: false });
  const saveCustom = () => persist(prefs);

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[59] bg-black/30 backdrop-blur-[1px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-2xl rounded-t-2xl bg-[var(--beige-card)] border-t border-x border-[var(--beige-border)] shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <h2
          id="cookie-consent-title"
          className="text-base font-semibold text-[var(--foreground)] mb-2"
        >
          Gestion des cookies
        </h2>

        {!customize ? (
          <>
            <p className="text-sm text-[var(--beige-text-light)] mb-4">
              Foodlane utilise des cookies strictement nécessaires au
              fonctionnement du service (session, sécurité, paiement). Avec
              ton accord, certains cookies optionnels peuvent aussi nous
              aider à mesurer l&apos;audience, à attribuer un parrainage ou
              à diffuser des publicités personnalisées via Google AdSense. Tu
              peux accepter, refuser ou personnaliser à tout moment.{" "}
              <a href="/confidentialite" className="underline underline-offset-2 hover:text-[#E94E77]">
                Politique de confidentialité
              </a>
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={refuseAll}
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-sm font-semibold text-[var(--foreground)] hover:border-[#E94E77] transition-colors"
              >
                Tout refuser
              </button>
              <button
                type="button"
                onClick={() => setCustomize(true)}
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-sm font-semibold text-[var(--foreground)] hover:border-[#E94E77] transition-colors"
              >
                Personnaliser
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="flex-1 px-4 py-2 rounded-xl bg-[#E94E77] text-white text-sm font-semibold hover:bg-[#D63D56] transition-colors"
              >
                Tout accepter
              </button>
            </div>
            <p className="mt-3 text-[11px] text-[var(--beige-text-muted)]">
              Plus d&apos;informations dans la{" "}
              <Link href="/cookies" className="underline hover:text-[#E94E77]">
                Politique de cookies
              </Link>{" "}
              et la{" "}
              <Link href="/confidentialite" className="underline hover:text-[#E94E77]">
                Politique de confidentialité
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--beige-text-light)] mb-4">
              Active ou désactive les cookies par catégorie. Les cookies
              strictement nécessaires ne peuvent pas être désactivés.
            </p>

            <ul className="space-y-3 text-sm">
              <li className="rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    Strictement nécessaires
                  </p>
                  <p className="text-xs text-[var(--beige-text-muted)] mt-1">
                    Connexion, sécurité, session, paiement. Indispensables
                    au service.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[var(--beige-text-muted)] uppercase tracking-wide whitespace-nowrap">
                  Toujours actifs
                </span>
              </li>

              <CategoryRow
                title="Mesure d'audience"
                description="Statistiques anonymisées pour comprendre comment Foodlane est utilisée et l'améliorer."
                checked={prefs.audience}
                onChange={(v) =>
                  setPrefs((p) => ({ ...p, audience: v }))
                }
              />

              <CategoryRow
                title="Parrainage / affiliation"
                description="Attribuer ton inscription à un parrain ou un affilié si tu arrives via un lien dédié (Refgrow)."
                checked={prefs.affiliation}
                onChange={(v) =>
                  setPrefs((p) => ({ ...p, affiliation: v }))
                }
              />

              <CategoryRow
                title="Marketing et publicité"
                description="Afficher des publicités Google AdSense et mesurer l'efficacité d'éventuelles campagnes (Meta, TikTok, Google Ads). Google et ses partenaires peuvent utiliser des cookies pour diffuser des annonces personnalisées. Voir aussi la page Comment Google utilise les données."
                checked={prefs.marketing}
                onChange={(v) =>
                  setPrefs((p) => ({ ...p, marketing: v }))
                }
              />
            </ul>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={refuseAll}
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-sm font-semibold text-[var(--foreground)] hover:border-[#E94E77] transition-colors"
              >
                Tout refuser
              </button>
              <button
                type="button"
                onClick={saveCustom}
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-sm font-semibold text-[var(--foreground)] hover:border-[#E94E77] transition-colors"
              >
                Enregistrer mes choix
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="flex-1 px-4 py-2 rounded-xl bg-[#E94E77] text-white text-sm font-semibold hover:bg-[#D63D56] transition-colors"
              >
                Tout accepter
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <li className="rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-4 py-3 flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-[var(--foreground)]">{title}</p>
        <p className="text-xs text-[var(--beige-text-muted)] mt-1">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${
          checked ? "bg-[#E94E77]" : "bg-[#D4C4B8]"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </li>
  );
}
