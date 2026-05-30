/**
 * Configuration publicitaire web (Google AdSense).
 * AdMob = SDK apps iOS/Android ; pour foodlane.fr c’est AdSense qui s’applique.
 */

export type AdPlacement = "mobile_bottom" | "tableau_inline";

const DEFAULT_ADSENSE_PUBLISHER_ID = "ca-pub-3828366277477392";

export function getAdsensePublisherId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID?.trim();
  return id || DEFAULT_ADSENSE_PUBLISHER_ID;
}

export function getAdsenseSlot(placement: AdPlacement): string | undefined {
  const key =
    placement === "mobile_bottom"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_BOTTOM
      : process.env.NEXT_PUBLIC_ADSENSE_SLOT_TABLEAU_INLINE;
  const id = key?.trim();
  return id || undefined;
}
