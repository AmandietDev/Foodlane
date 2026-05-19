"use client";

import Script from "next/script";

type Props = {
  email: string;
  projectId: string;
};

/**
 * Widget Refgrow (page.js) — réservé aux emails listés dans AFFILIATE_DASHBOARD_EMAILS.
 */
export default function ParrainageRefgrowWidget({ email, projectId }: Props) {
  return (
    <>
      <div
        id="refgrow"
        className="min-h-[420px] w-full overflow-hidden rounded-2xl border border-[#E8A0A0] bg-white shadow-sm"
        data-project-id={projectId}
        data-project-email={email}
      />
      <Script src="https://scripts.refgrowcdn.com/page.js" strategy="afterInteractive" />
    </>
  );
}
