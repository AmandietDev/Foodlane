import Script from "next/script";

export default function AdsenseScript() {
  return (
    <Script
      id="adsense-script"
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3828366277477392"
      crossOrigin="anonymous"
      strategy="beforeInteractive"
    />
  );
}
