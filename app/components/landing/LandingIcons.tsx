import Image from "next/image";
import Link from "next/link";

type IconProps = { className?: string };

export function FoodlaneLogoMark({ className = "h-9 w-9" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="20" fill="#FFE4E0" />
      <path
        d="M20 8c-2 4-6 6-6 11 0 4 2.5 7 6 7s6-3 6-7c0-5-4-7-6-11z"
        fill="#E94E67"
      />
      <path
        d="M20 26c1.5 2 3.5 3 5 3 1.2 0 2-.5 2-1.5 0-2-3-3.5-7-3.5s-7 1.5-7 3.5c0 1 1 1.5 2 1.5 1.5 0 3.5-1 5-3z"
        fill="#F9A8B4"
      />
    </svg>
  );
}

export function FeatureIcon({ type, className = "h-9 w-9" }: IconProps & { type: string }) {
  const stroke = "#1A1A1A";
  const accent = "#E94E77";

  switch (type) {
    case "chef":
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M8 20h16M10 20v-2c0-3.5 2.8-6 6-6s6 2.5 6 6v2"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 14c0-4 3.2-7 7-7s7 3 7 7"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path d="M11 11c1-1.5 2.5-2 4-2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M21 11c-1-1.5-2.5-2-4-2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <rect x="8" y="6" width="16" height="20" rx="2" stroke={stroke} strokeWidth="1.75" />
          <path d="M13 6V5a3 3 0 016 0v1" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          <path d="M12 13h8M12 17h8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M10.5 12.5l1 1 2-2M10.5 16.5l1 1 2-2"
            stroke={accent}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "chef-heart":
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M8 20h14M10 20v-2c0-3 2.5-5.5 5.5-5.5S21 15 21 18v2"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 14c0-3.5 2.8-6.5 6.5-6.5S22 10.5 22 14"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M20.5 21.5c.8-.8 2-.8 2.8 0 .8.8.8 2 0 2.8l-2.8 2.8-2.8-2.8c-.8-.8-.8-2 0-2.8z"
            fill={accent}
            stroke={accent}
            strokeWidth="1"
          />
        </svg>
      );
    case "ruler":
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M9 23 23 9"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path d="M11 21l2-2M14 18l2-2M17 15l2-2M20 12l2-2" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" />
          <path
            d="M19 7l1.2 1.2M22 9.5l1.2 1.2"
            stroke={accent}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="20" cy="8" r="1" fill={accent} />
          <circle cx="23.5" cy="10.5" r="1" fill={accent} />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <circle cx="16" cy="16" r="8" stroke={stroke} strokeWidth="1.75" />
        </svg>
      );
  }
}

export function CheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="#FFE4E0" />
      <path d="M6 10l2.5 2.5L14 7" stroke="#E94E67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="#E94E67" aria-hidden>
      <path d="M10 1.5l2.2 5.5 5.8.5-4.4 3.8 1.4 5.7L10 14.2 5 16.9l1.4-5.7-4.4-3.8 5.8-.5L10 1.5z" />
    </svg>
  );
}

export function HeartIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.5-7-9.5a4 4 0 017-2.5 4 4 0 017 2.5C19 15.5 12 20 12 20z"
        stroke="#E94E67"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const ASSISTANT_ROBOT_WIDTH = 287;
const ASSISTANT_ROBOT_HEIGHT = 366;

export function RobotIllustration({
  className = "",
  fill = false,
}: IconProps & { fill?: boolean }) {
  if (fill) {
    return (
      <Image
        src="/landing/assistant-robot.png"
        alt="Assistant diététicien IA Foodlane"
        fill
        className={className}
        unoptimized
        sizes="268px"
      />
    );
  }

  return (
    <Image
      src="/landing/assistant-robot.png"
      alt="Assistant diététicien IA Foodlane"
      width={ASSISTANT_ROBOT_WIDTH}
      height={ASSISTANT_ROBOT_HEIGHT}
      className={`object-contain ${className}`}
      unoptimized
    />
  );
}

export function AppStoreBadge({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center gap-2 rounded-xl bg-black px-4 text-white transition hover:bg-neutral-800"
      aria-label="App Store — bientôt disponible"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden>
        <path d="M18.7 12.5c-.1-2.1 1.7-3.1 1.8-3.2-1-.1-2-.6-2.5-1.4-.6-.8-1.5-1.2-2.4-1.2-1 0-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.8 1.7-1.2 2.1-.3 5.2.8 6.9.6.8 1.2 1.7 2.1 1.7.8 0 1.1-.5 2.2-.5 1 0 1.3.5 2.2.5.9 0 1.5-.8 2.1-1.6.7-.9 1-1.9 1-1.9-.1 0-2-.8-2-3.1zM15.5 4.2c.5-.6.9-1.5.8-2.3-.8 0-1.7.5-2.2 1.1-.5.6-1 1.5-.9 2.3.9.1 1.8-.5 2.3-1.1z" />
      </svg>
      <div className="text-left leading-tight">
        <div className="text-[9px] opacity-80">Télécharger sur</div>
        <div className="text-sm font-semibold">App Store</div>
      </div>
    </Link>
  );
}

export function GooglePlayBadge({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center gap-2 rounded-xl bg-black px-4 text-white transition hover:bg-neutral-800"
      aria-label="Google Play — bientôt disponible"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <path fill="#00D9FF" d="M3 2.5v19l10.5-9.5L3 2.5z" />
        <path fill="#00F076" d="M13.5 12 3 21.5l14.5-8.5L13.5 12z" />
        <path fill="#FF3A44" d="M3 2.5l10.5 9.5L17.5 8 3 2.5z" />
        <path fill="#FFB900" d="M13.5 12 17.5 16 21 12.5 17.5 8 13.5 12z" />
      </svg>
      <div className="text-left leading-tight">
        <div className="text-[9px] opacity-80">Disponible sur</div>
        <div className="text-sm font-semibold">Google Play</div>
      </div>
    </Link>
  );
}
