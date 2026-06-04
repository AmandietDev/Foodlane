import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { LOGIN_HREF, SIGNUP_HREF } from "./landingTheme";

export function LandingLogo({
  className = "",
  wordmarkStyle,
}: {
  className?: string;
  wordmarkStyle?: CSSProperties;
}) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo-app.png"
        alt="Foodlane"
        width={44}
        height={45}
        className="h-11 w-auto shrink-0 object-contain"
        priority
        unoptimized
      />
      <span
        className="text-[2rem] leading-none text-[#E94E77]"
        style={wordmarkStyle}
      >
        Foodlane
      </span>
    </Link>
  );
}

export function PrimaryButton({
  href = SIGNUP_HREF,
  children,
  className = "",
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full bg-[#E94E77] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#E94E77]/25 transition hover:scale-[1.02] hover:bg-[#D63D56] active:scale-[0.98] ${className}`}
    >
      {children}
    </Link>
  );
}

export function OutlineButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full border border-[#E94E77] bg-white px-6 py-2.5 text-sm font-bold text-[#E94E77] transition hover:bg-[#FFF5F5] ${className}`}
    >
      {children}
    </Link>
  );
}

export function AccountButton({ className = "" }: { className?: string }) {
  return (
    <OutlineButton href={LOGIN_HREF} className={className}>
      Accéder à mon compte
    </OutlineButton>
  );
}

export function SectionShell({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`px-4 py-14 sm:px-6 md:py-20 lg:px-8 bg-white ${className}`}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
