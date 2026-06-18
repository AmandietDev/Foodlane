import type { Metadata } from "next";

import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez l'équipe Foodlane : support, questions techniques et partenariats.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
