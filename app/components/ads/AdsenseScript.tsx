import Script from "next/script";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3828366277477392";

export default function AdsenseScript() {
  return (
    <Script
      id="adsense-script"
      async
      src={ADSENSE_SRC}
      crossOrigin="anonymous"
      strategy="beforeInteractive"
    />
  );
}
