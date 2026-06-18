"use client";

import { usePathname } from "next/navigation";
import { APP_MOBILE_BOTTOM } from "./app/appLayoutTheme";
import { isMarketingPublicPath } from "../src/lib/publicRoutes";

/** Sur la landing et les pages marketing publiques, pas de marge nav ni padding : plein écran. */
export default function AppContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = isMarketingPublicPath(pathname);

  if (isFullBleed) {
    return <>{children}</>;
  }

  return (
    <div
      className="min-h-screen md:pb-10 md:pl-[var(--app-nav-rail-width)]"
      style={{ paddingBottom: APP_MOBILE_BOTTOM }}
    >
      {children}
    </div>
  );
}
