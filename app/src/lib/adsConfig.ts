/**
 * Configuration publicitaire web (Google AdSense).
 */

export type AdPlacement = "mobile_bottom" | "tableau_inline";

export function getAdsensePublisherId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID?.trim();
  return id || undefined;
}

export function getAdsenseSlot(placement: AdPlacement): string | undefined {
  const key =
    placement === "mobile_bottom"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_BOTTOM
      : process.env.NEXT_PUBLIC_ADSENSE_SLOT_TABLEAU_INLINE;
  return key?.trim() || undefined;
}

export function getAdsenseScriptSrc(publisherId: string): string {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
}
