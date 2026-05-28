import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata, faqSchema, softwareSchema } from "./src/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Organise facilement tes repas de la semaine",
  description:
    "Génère automatiquement tes menus de semaine, crée une liste de courses intelligente et simplifie ton alimentation avec Foodlane.",
  path: "/",
  keywords: [
    "menu semaine",
    "menu de la semaine",
    "liste de courses",
    "liste de courses automatique",
    "planification repas",
    "organisation repas",
    "assistant nutrition",
    "meal planner",
  ],
});

const links = [
  { href: "/menu-semaine", label: "Menu semaine" },
  { href: "/liste-de-courses", label: "Liste de courses automatique" },
  { href: "/organisation-repas", label: "Organisation repas" },
  { href: "/meal-planner", label: "Meal planner" },
  { href: "/menus-equilibres", label: "Menus équilibrés" },
  { href: "/assistant-nutrition", label: "Assistant nutrition" },
  { href: "/economies-courses", label: "Économies courses" },
  { href: "/gaspillage-alimentaire", label: "Réduire le gaspillage alimentaire" },
];

const faq = [
  {
    question: "Foodlane est-il une application de recettes ?",
    answer:
      "Foodlane va plus loin : menu de la semaine, planification repas, liste de courses intelligente, assistant nutrition et défis habitudes alimentaires.",
  },
  {
    question: "Comment Foodlane aide à mieux manger ?",
    answer:
      "Foodlane propose des menus équilibrés, des conseils nutrition simples et une organisation alimentaire claire pour tenir dans la durée.",
  },
];

export default function RootPage() {
  const faqJsonLd = faqSchema(faq);
  const softwareJsonLd = softwareSchema();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="space-y-4">
        <h1 className="text-3xl md:text-5xl font-bold text-[var(--foreground)]">
          Organise facilement tes repas de la semaine
        </h1>
        <p className="text-base md:text-lg text-[var(--beige-text-light)]">
          Génère automatiquement tes menus, crée une liste de courses intelligente
          et simplifie ton alimentation grâce à ton assistant nutrition.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/login" className="rounded-xl bg-[#D44A4A] text-white px-4 py-2 text-sm font-semibold">
            Commencer gratuitement
          </Link>
          <Link href="/menu-semaine" className="rounded-xl border border-[var(--beige-border)] px-4 py-2 text-sm font-semibold">
            Voir le menu semaine
          </Link>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-semibold mb-3">Pourquoi utiliser Foodlane</h2>
        <p className="text-[var(--beige-text-light)]">
          Foodlane est l&apos;assistant intelligent pour l&apos;organisation des repas :
          planning repas, menus équilibrés, liste de courses automatique, recettes
          faciles et nutrition simple. Objectif : gagner du temps, faire des
          économies sur les courses et réduire le gaspillage alimentaire.
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-[var(--beige-border)] p-4">
          <h3 className="font-semibold mb-2">Gagner du temps en cuisine</h3>
          <p className="text-sm text-[var(--beige-text-light)]">
            Plus besoin de chercher quoi manger ce soir. Ton menu de semaine est
            prêt, avec des idées repas simples et des recettes rapides.
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--beige-border)] p-4">
          <h3 className="font-semibold mb-2">Faire des économies sur les courses</h3>
          <p className="text-sm text-[var(--beige-text-light)]">
            La liste de courses intelligente regroupe l&apos;essentiel et évite les
            achats inutiles pour mieux gérer le budget alimentaire.
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--beige-border)] p-4">
          <h3 className="font-semibold mb-2">Réduire le gaspillage alimentaire</h3>
          <p className="text-sm text-[var(--beige-text-light)]">
            En planifiant les repas, tu consommes mieux tes produits et tu jettes
            moins. Foodlane structure ton organisation alimentaire.
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--beige-border)] p-4">
          <h3 className="font-semibold mb-2">Mieux manger au quotidien</h3>
          <p className="text-sm text-[var(--beige-text-light)]">
            L&apos;assistant diététique aide à créer des repas équilibrés, à suivre des
            défis nutrition et à améliorer les habitudes sans complexité.
          </p>
        </article>
      </section>

      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-semibold mb-3">Pages utiles</h2>
        <nav aria-label="Navigation SEO Foodlane" className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border border-[var(--beige-border)] px-3 py-1.5 text-sm hover:border-[#D44A4A]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">FAQ</h2>
        <div className="space-y-3">
          {faq.map((f) => (
            <article key={f.question} className="rounded-xl border border-[var(--beige-border)] p-4">
              <h3 className="font-semibold">{f.question}</h3>
              <p className="mt-1 text-sm text-[var(--beige-text-light)]">{f.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
