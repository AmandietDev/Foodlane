import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LANDING_PAGES, buildMetadata, faqSchema } from "../src/lib/seo";
import { PublicLegalFooter } from "../components/legal/PublicLegalFooter";

type Params = { slug: string };

function getLanding(slug: string) {
  return LANDING_PAGES.find((p) => p.slug === slug) || null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const landing = getLanding(slug);
  if (!landing) return {};
  return buildMetadata({
    title: `${landing.title} | Application organisation repas`,
    description: landing.description,
    path: `/${landing.slug}`,
    keywords: [
      landing.slug.replace(/-/g, " "),
      "menu semaine",
      "liste de courses",
      "organisation repas",
      "assistant nutrition",
    ],
  });
}

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }));
}

export default async function LandingPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const landing = getLanding(slug);
  if (!landing) notFound();

  const faqJsonLd = faqSchema(landing.faq);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "/" },
      { "@type": "ListItem", position: 2, name: landing.title, item: `/${landing.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Fil d'ariane" className="text-sm mb-4 text-[var(--beige-text-muted)]">
        <Link href="/">Accueil</Link> / <span>{landing.title}</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{landing.h1}</h1>
        <p className="text-[var(--beige-text-light)]">{landing.intro}</p>
      </header>

      <section className="mt-8 space-y-4">
        {landing.sections.map((s) => (
          <article key={s.title} className="rounded-xl border border-[var(--beige-border)] p-4">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="mt-2 text-[var(--beige-text-light)]">{s.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold mb-4">FAQ</h2>
        <div className="space-y-3">
          {landing.faq.map((f) => (
            <article key={f.question} className="rounded-xl border border-[var(--beige-border)] p-4">
              <h3 className="font-semibold">{f.question}</h3>
              <p className="mt-1 text-sm text-[var(--beige-text-light)]">{f.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Aller plus loin</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/menu-semaine" className="rounded-full border border-[var(--beige-border)] px-3 py-1.5 text-sm">
            Menu de semaine
          </Link>
          <Link href="/tableau" className="rounded-full border border-[var(--beige-border)] px-3 py-1.5 text-sm">
            Tableau Foodlane
          </Link>
          <Link href="/blog" className="rounded-full border border-[var(--beige-border)] px-3 py-1.5 text-sm">
            Blog nutrition
          </Link>
        </div>
      </section>

      <PublicLegalFooter />
    </main>
  );
}

