"use client";

import dynamic from "next/dynamic";

const SplashScreen = dynamic(() => import("./SplashScreen"), { ssr: false });
const RefgrowScriptLoader = dynamic(() => import("./RefgrowScriptLoader"), { ssr: false });
const RefgrowReferralHint = dynamic(() => import("./RefgrowReferralHint"), { ssr: false });

type LayoutClientExtrasProps = {
  refgrowProjectId?: string;
};

export default function LayoutClientExtras({ refgrowProjectId }: LayoutClientExtrasProps) {
  return (
    <>
      <SplashScreen />
      {refgrowProjectId ? <RefgrowScriptLoader projectId={refgrowProjectId} /> : null}
      {refgrowProjectId ? <RefgrowReferralHint /> : null}
    </>
  );
}
