import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
  { href: "/cgu", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/contact", label: "Contact" },
] as const;

export function PublicLegalFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`mt-12 border-t border-[var(--beige-border)] pt-6 ${className}`}>
      <nav
        className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--beige-text-muted)]"
        aria-label="Documents légaux"
      >
        {LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-[#E94E77] transition-colors">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-4 text-xs text-[var(--beige-text-muted)]">
        © {new Date().getFullYear()} Foodlane — Tous droits réservés.
      </p>
    </footer>
  );
}
