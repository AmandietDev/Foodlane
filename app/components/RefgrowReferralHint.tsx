"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const DISMISS_KEY = "foodlane_refgrow_ref_hint_dismissed";

function hasRefgrowRefCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("refgrow_ref_code="));
}

function RefgrowReferralHintInner() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      return () => {
        mounted = false;
      };
    }

    const refParam = searchParams.get("ref")?.trim();
    if (refParam) {
      setVisible(true);
      return () => {
        mounted = false;
      };
    }

    const id = window.setTimeout(() => {
      if (!mounted) return;
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
      if (hasRefgrowRefCookie()) setVisible(true);
    }, 1800);

    return () => {
      mounted = false;
      window.clearTimeout(id);
    };
  }, [searchParams]);

  if (!visible) return null;

  return (
    <>
      <div className="h-11 w-full shrink-0" aria-hidden />
      <div
        role="status"
        className="fixed top-0 left-0 right-0 z-[60] border-b border-[#E8C4C4] bg-[#FFF5F3] px-3 py-2 text-center text-xs text-[#5C2A2A] shadow-sm"
      >
        <span className="font-medium">Lien partenaire détecté.</span>{" "}
        <span className="text-[#7A4545]">Ta visite peut être associée au parrainage (cookie Refgrow, ~30 jours).</span>
        <button
          type="button"
          className="ml-2 inline-flex items-center rounded-md bg-[#E94E77] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#b83d3d]"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, "1");
            setVisible(false);
          }}
        >
          OK
        </button>
      </div>
    </>
  );
}

/**
 * Refgrow ne montre pas de « badge » tout seul : le script latest.js est invisible.
 * Ce bandeau rassure quand l’URL contient ?ref=… ou quand le cookie refgrow_ref_code est présent.
 */
export default function RefgrowReferralHint() {
  return (
    <Suspense fallback={null}>
      <RefgrowReferralHintInner />
    </Suspense>
  );
}
