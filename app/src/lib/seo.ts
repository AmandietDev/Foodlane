"use server";

import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://foodlane.fr";

export type FaqItem = { question: string; answer: string };

export type LandingPageConfig = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
  faq: FaqItem[];
};

const defaultFaq: FaqItem[] = [
  {
    question: "Comment Foodlane m'aide à organiser mes repas ?",
    answer:
      "Foodlane génère un menu de la semaine adapté à tes objectifs, crée une liste de courses intelligente et te guide chaque jour avec des conseils nutrition simples.",
  },
  {
    question: "Est-ce utile pour gagner du temps et faire des économies ?",
    answer:
      "Oui. En planifiant les repas à l'avance, tu cuisines mieux, achètes seulement l'essentiel, réduis les achats impulsifs et limites le gaspillage alimentaire.",
  },
  {
    question: "Foodlane est-il adapté à une alimentation équilibrée ?",
    answer:
      "Oui. L'assistant nutrition aide à composer des menus équilibrés, à améliorer les habitudes et à garder une alimentation simple et durable.",
  },
];

export const LANDING_PAGES: LandingPageConfig[] = [
  "liste-de-courses",
  "organisation-repas",
  "meal-planner",
  "batch-cooking",
  "meal-prep",
  "menus-equilibres",
  "menus-perte-de-poids",
  "idees-repas",
  "quoi-manger-ce-soir",
  "organisation-alimentaire",
  "economies-courses",
  "gaspillage-alimentaire",
  "assistant-nutrition",
  "application-nutrition",
].map((slug) => ({
  slug,
  title: slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()),
  description:
    "Découvre comment Foodlane simplifie la planification des repas, la liste de courses automatique et l'alimentation équilibrée au quotidien.",
  h1: `${slug.replace(/-/g, " ")} : organise tes repas simplement`,
  intro:
    "Foodlane t'aide à planifier tes repas de semaine, créer des courses intelligentes, gagner du temps en cuisine et mieux manger sans complexité.",
  sections: [
    {
      title: "Planification des repas efficace",
      body: "Crée un planning repas clair avec menus équilibrés, recettes faciles et adaptation à ton rythme de vie.",
    },
    {
      title: "Liste de courses intelligente",
      body: "Génère automatiquement ta liste de courses, évite les oublis, limite le gaspillage alimentaire et fais des économies.",
    },
    {
      title: "Assistant nutrition au quotidien",
      body: "Améliore progressivement tes habitudes alimentaires avec des conseils nutrition concrets et des défis simples.",
    },
  ],
  faq: defaultFaq,
}));

export const BLOG_POSTS = [
  {
    slug: "organiser-menu-semaine-facilement",
    title: "Comment organiser un menu de semaine facilement",
    excerpt:
      "Une méthode simple pour planifier tes repas, faire une liste de courses et gagner du temps chaque semaine.",
  },
  {
    slug: "liste-courses-intelligente-economies",
    title: "Liste de courses intelligente : faire des économies",
    excerpt:
      "Réduis ton budget alimentaire avec une liste de courses structurée et adaptée à tes menus.",
  },
  {
    slug: "reduire-gaspillage-alimentaire-quotidien",
    title: "Réduire le gaspillage alimentaire au quotidien",
    excerpt:
      "Des actions simples pour mieux planifier, mieux stocker et mieux cuisiner sans jeter.",
  },
];

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

export function buildMetadata(args: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  return {
    title: args.title,
    description: args.description,
    keywords: args.keywords,
    alternates: { canonical: args.path },
    openGraph: {
      type: "website",
      url: args.path,
      title: args.title,
      description: args.description,
      siteName: "Foodlane",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: args.title,
      description: args.description,
    },
  };
}

export function faqSchema(faq: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function softwareSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Foodlane",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    description:
      "Assistant intelligent pour organiser ses repas : menu semaine automatique, liste de courses intelligente et nutrition simplifiée.",
    url: SITE_URL,
  };
}

