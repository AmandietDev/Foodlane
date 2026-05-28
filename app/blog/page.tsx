import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS, buildMetadata } from "../src/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Blog nutrition et organisation des repas",
  description:
    "Guides pratiques sur les menus de semaine, la liste de courses, la nutrition simple, le meal prep et la réduction du gaspillage alimentaire.",
  path: "/blog",
  keywords: [
    "blog nutrition",
    "organisation repas",
    "menu semaine",
    "liste de courses",
    "meal prep",
    "batch cooking",
  ],
});

export default function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Blog Foodlane</h1>
      <p className="text-[var(--beige-text-light)] mb-8">
        Conseils concrets pour mieux organiser tes repas, tes courses et ton équilibre alimentaire.
      </p>

      <section className="space-y-4">
        {BLOG_POSTS.map((post) => (
          <article key={post.slug} className="rounded-xl border border-[var(--beige-border)] p-4">
            <h2 className="text-xl font-semibold">
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="mt-2 text-sm text-[var(--beige-text-light)]">{post.excerpt}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

