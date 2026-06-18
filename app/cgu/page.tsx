import type { Metadata } from "next";

import { LegalPageView } from "../components/legal/LegalPageView";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "CGU Foodlane : règles d'utilisation du service, offre gratuite et premium.",
  alternates: { canonical: "/cgu" },
};

export default function CguPage() {
  return <LegalPageView doc="cgu" />;
}
