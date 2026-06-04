"use client";

import { usePathname } from "next/navigation";

/** Sur la landing `/`, pas de marge nav ni padding : plein écran. */
export default function AppContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = pathname === "/" || pathname === "/coming-soon";

  if (isFullBleed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen pb-36 md:pb-10 md:pl-[var(--app-nav-rail-width)]">{children}</div>
  );
}
