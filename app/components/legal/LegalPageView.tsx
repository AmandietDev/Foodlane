"use client";

import {
  CGUContent,
  CGVContent,
  ConfidentialiteContent,
  CookiesContent,
  MentionsLegalesContent,
} from "../LegalDocuments";
import { LegalPageShell } from "./LegalPageShell";

export type LegalDocKey =
  | "mentions"
  | "confidentialite"
  | "cookies"
  | "cgu"
  | "cgv";

const CONFIG: Record<
  LegalDocKey,
  { title: string; Content: typeof MentionsLegalesContent }
> = {
  mentions: { title: "Mentions légales", Content: MentionsLegalesContent },
  confidentialite: { title: "Politique de confidentialité", Content: ConfidentialiteContent },
  cookies: { title: "Politique de cookies", Content: CookiesContent },
  cgu: { title: "Conditions Générales d'Utilisation", Content: CGUContent },
  cgv: { title: "Conditions Générales de Vente", Content: CGVContent },
};

type Props = {
  doc: LegalDocKey;
};

export function LegalPageView({ doc }: Props) {
  const { title, Content } = CONFIG[doc];
  return (
    <LegalPageShell title={title}>
      <Content variant="default" />
    </LegalPageShell>
  );
}
