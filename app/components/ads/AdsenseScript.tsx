import Script from "next/script";
import { getAdsensePublisherId } from "../../src/lib/adsConfig";

/** Script AdSense global — une seule injection via le layout racine. */
export default function AdsenseScript() {
  const clientId = getAdsensePublisherId();
  if (!clientId) return null;

  return (
    <Script
      id="google-adsense"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`}
      crossOrigin="anonymous"
      data-foodlane-adsense="1"
    />
  );
}
