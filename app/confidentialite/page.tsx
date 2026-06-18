import type { Metadata } from "next";

import { LegalPageView } from "../components/legal/LegalPageView";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité Foodlane : données collectées, finalités, droits RGPD et sous-traitants.",
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  return <LegalPageView doc="confidentialite" />;
}
