import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, buildMetadata, faqSchema } from "../../src/lib/seo";
import { PublicLegalFooter } from "../../components/legal/PublicLegalFooter";

type Params = { slug: string };

function getPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug) || null;
}

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    keywords: ["organisation repas", "nutrition", "menus équilibrés", "liste de courses"],
  });
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const faq = [
    {
      question: "Quelle est la première étape pour mieux organiser ses repas ?",
      answer:
        "Commence par planifier 5 à 7 repas à l'avance puis génère une liste de courses associée pour éviter les oublis et les achats non utiles.",
    },
    {
      question: "Comment garder des repas équilibrés sur la durée ?",
      answer:
        "Prépare un cadre simple : protéines, légumes, féculents adaptés, puis ajuste chaque semaine selon ton rythme et tes objectifs.",
    },
  ];
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: "Foodlane" },
    publisher: { "@type": "Organization", name: "Foodlane" },
    mainEntityOfPage: `/blog/${post.slug}`,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faq)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <nav aria-label="Fil d'ariane" className="text-sm mb-4 text-[var(--beige-text-muted)]">
        <Link href="/">Accueil</Link> / <Link href="/blog">Blog</Link> / <span>{post.title}</span>
      </nav>

      <article>
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="mt-3 text-[var(--beige-text-light)]">{post.excerpt}</p>

        <section className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold">Planification repas et menu de semaine</h2>
          <p>
            Pour améliorer ton organisation repas, définis un menu de la semaine réaliste, avec des recettes rapides
            et des options batch cooking. Cette routine réduit la charge mentale et le temps perdu.
          </p>
          <h3 className="text-xl font-semibold">Liste de courses intelligente</h3>
          <p>
            Crée une liste de courses à partir du planning repas pour acheter juste ce qu&apos;il faut. Tu gagnes du
            temps, fais des économies courses et limites le gaspillage alimentaire.
          </p>
          <h3 className="text-xl font-semibold">Nutrition simple et durable</h3>
          <p>
            L&apos;objectif n&apos;est pas la perfection mais la constance : repas équilibrés, organisation alimentaire,
            habitudes progressives et choix adaptés à ton quotidien.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-3">FAQ</h2>
          <div className="space-y-3">
            {faq.map((f) => (
              <div key={f.question} className="rounded-xl border border-[var(--beige-border)] p-4">
                <h3 className="font-semibold">{f.question}</h3>
                <p className="mt-1 text-sm text-[var(--beige-text-light)]">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </article>

      <PublicLegalFooter />
    </main>
  );
}

