import Script from "next/script";
import { getAdsensePublisherId, getAdsenseScriptSrc } from "../../src/lib/adsConfig";

export default function AdsenseScript() {
  const publisherId = getAdsensePublisherId();
  if (!publisherId) return null;

  return (
    <Script
      id="adsense-script"
      data-foodlane-adsense="1"
      async
      src={getAdsenseScriptSrc(publisherId)}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
