import type { Metadata } from "next";

import { LegalPageView } from "../components/legal/LegalPageView";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de Foodlane : éditeur, hébergement, contact et informations réglementaires.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return <LegalPageView doc="mentions" />;
}
