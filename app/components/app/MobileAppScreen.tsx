"use client";

import Link from "next/link";
import { appLayoutTheme } from "./appLayoutTheme";

function BackChevron({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type MobileAppScreenProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  contentClassName?: string;
};

export function MobileAppScreen({
  title,
  subtitle,
  backHref = "/menu",
  onBack,
  children,
  headerAction,
  contentClassName = "px-4 pt-4 pb-2",
}: MobileAppScreenProps) {
  return (
    <main
      className="mx-auto min-h-screen max-w-md"
      style={{ backgroundColor: appLayoutTheme.pageBg }}
    >
      <header
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{
          backgroundColor: appLayoutTheme.pageBg,
          borderColor: appLayoutTheme.cardPinkBorder,
        }}
      >
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="-ml-2 p-2 text-[#4A2C2A]"
              aria-label="Retour"
            >
              <BackChevron />
            </button>
          ) : (
            <Link href={backHref} className="-ml-2 p-2 text-[#4A2C2A]" aria-label="Retour">
              <BackChevron />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-[#4A2C2A]">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 text-xs leading-snug text-[#8A6F6F]">{subtitle}</p>
            ) : null}
          </div>
          {headerAction}
        </div>
      </header>
      <div className={contentClassName}>{children}</div>
    </main>
  );
}

export function MobileSectionCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[1.5rem] border border-[#F5DDE5] bg-[#FFF0F3] px-4 py-4 shadow-[0_4px_20px_rgba(233,78,119,0.08)] ${className}`}
    >
      {title ? <h2 className="mb-3 text-base font-semibold text-[#4A2C2A]">{title}</h2> : null}
      {children}
    </section>
  );
}
