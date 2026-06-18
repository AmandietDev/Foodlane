import Link from "next/link";
import { ReactNode } from "react";

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
  { href: "/cgu", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/contact", label: "Contact" },
] as const;

type Props = {
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ title, children }: Props) {
  return (
    <main className="min-h-screen bg-[#FFF9F5] text-[#3D2525]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-[#7A5C5C] hover:text-[#E94E77] transition-colors"
        >
          ← Retour à Foodlane
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-[#3D2525] sm:text-3xl">{title}</h1>

        <article className="mt-8 space-y-6 text-sm leading-relaxed text-[#5C4040] sm:text-base">
          {children}
        </article>

        <footer className="mt-12 border-t border-[#FFE4E0] pt-6">
          <nav
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#7A5C5C]"
            aria-label="Documents légaux"
          >
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[#E94E77] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-xs text-[#9A7A7A]">
            © {new Date().getFullYear()} Foodlane — Tous droits réservés.
          </p>
        </footer>
      </div>
    </main>
  );
}
