import type { MetadataRoute } from "next";
import { BLOG_POSTS, LANDING_PAGES, SITE_URL } from "./src/lib/seo";
import { LEGAL_PUBLIC_PATHS } from "./src/lib/publicRoutes";

const staticPages = [
  "/",
  "/organise-repas",
  "/menu-semaine",
  "/tableau",
  "/equilibre",
  "/premium",
  "/login",
  "/blog",
  ...LEGAL_PUBLIC_PATHS,
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries = staticPages.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));

  const landingEntries = LANDING_PAGES.map((p) => ({
    url: `${SITE_URL}/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const blogEntries = BLOG_POSTS.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  return [...staticEntries, ...landingEntries, ...blogEntries];
}

