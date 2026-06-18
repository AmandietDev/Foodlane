import type { Metadata } from "next";

import { LegalPageView } from "../components/legal/LegalPageView";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
  description: "CGV Foodlane : abonnements premium, paiement Stripe, résiliation et droit de rétractation.",
  alternates: { canonical: "/cgv" },
};

export default function CgvPage() {
  return <LegalPageView doc="cgv" />;
}
