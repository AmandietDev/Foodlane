"use client";

/**
 * Composants partagés pour les documents légaux de Foodlane.
 *
 * Les infos d'identité (SIRET, RCS, adresse, etc.) proviennent du Kbis
 * délivré le 11/02/2026 par le Greffe du Tribunal de Commerce de Toulon.
 *
 * Utilisé dans :
 *  - app/menu/page.tsx (section « Infos légales » – onglets premium & paramètres)
 *  - app/compte/page.tsx (modal CGU à la création de compte)
 *
 * Pour mettre à jour une info légale, modifier UNIQUEMENT ce fichier.
 */

import { ReactNode } from "react";

import { openCookieConsentBanner } from "./CookieConsentBanner";

/* ============================================================
 * Constantes – infos officielles de l'entreprise
 * ============================================================ */

export const FOODLANE_LEGAL_INFO = {
  /** Personne physique exploitant l'activité (Kbis RCS Toulon). */
  editorFullName: "FONTAINE Amandine Sandrine Hélène Alice",
  editorDisplayName: "Amandine FONTAINE",
  /** Nom commercial inscrit au Kbis. */
  commercialName: "WayDia",
  /** Nom commercial / marque de l'application. */
  appName: "Foodlane",
  /** Statut juridique. */
  status:
    "Entrepreneur Individuel (EI) — micro-entreprise (personne physique commerçante)",
  /** Adresse du siège et de l'établissement principal. */
  address: "29 Boulevard Saint Henri, 83200 Toulon, France",
  /** SIREN à 9 chiffres (Kbis). */
  siren: "988 976 163",
  /** SIRET de l'établissement principal (SIREN + NIC). */
  siret: "988 976 163 00036",
  /** Immatriculation RCS. */
  rcs: "RCS Toulon — n° 988 976 163",
  /** Numéro de gestion attribué par le greffe. */
  gestionNumber: "2026A00413",
  /** Date d'immatriculation au RCS. */
  registrationDate: "11 février 2026",
  /** Date de commencement effectif d'activité. */
  activityStartDate: "2 février 2026",
  /** Greffe d'immatriculation. */
  registry:
    "Greffe du Tribunal de Commerce de Toulon — 140 Boulevard Maréchal Leclerc, CS 30509, 83041 Toulon Cedex",
  /** Activité déclarée au RCS. */
  activity: "Vente en ligne de programmes d'accompagnement nutritionnel",
  /** Code APE / NAF attribué par l'INSEE. */
  apeCode: "4791B — Vente à distance sur catalogue spécialisé",
  /** Régime TVA. */
  vatStatus:
    "TVA non applicable — article 293 B du Code général des impôts (franchise en base de TVA)",
  /** Email de contact public. */
  email: "contact@foodlane.fr",
  /** Domaine principal de l'application. */
  domain: "foodlane.fr",
  /** Nom de domaine inscrit au Kbis. */
  kbisDomain: "way-dia.com",
  /** Date de dernière mise à jour de ces documents. */
  lastUpdate: "2 juin 2026",
} as const;

/* ============================================================
 * Variantes de style (page principale vs modal)
 * ============================================================ */

type Variant = "default" | "modal";

const STYLES = {
  default: {
    heading: "font-semibold text-[var(--foreground)] mb-2",
  },
  modal: {
    heading: "font-semibold text-[#6B2E2E] mb-2",
  },
} as const;

function Section({
  variant = "default",
  title,
  children,
}: {
  variant?: Variant;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className={STYLES[variant].heading}>{title}</h3>
      <p className="space-y-1">{children}</p>
    </div>
  );
}

/* ============================================================
 * Mentions légales
 * ============================================================ */

export function MentionsLegalesContent({
  variant = "default",
}: { variant?: Variant } = {}) {
  const I = FOODLANE_LEGAL_INFO;
  return (
    <>
      <Section variant={variant} title="Éditeur de l'application">
        L&apos;application <strong>Foodlane</strong> est éditée par :
        <br />
        <strong>{I.editorDisplayName}</strong>
        <br />
        {I.status}
        <br />
        Exerçant sous le nom commercial <strong>{I.commercialName}</strong>
        <br />
        Adresse professionnelle : {I.address}
        <br />
        SIREN : {I.siren}
        <br />
        SIRET (établissement principal) : {I.siret}
        <br />
        {I.rcs}
        <br />
        N° de gestion : {I.gestionNumber}
        <br />
        Date d&apos;immatriculation : {I.registrationDate}
        <br />
        Début d&apos;activité : {I.activityStartDate}
        <br />
        Activité déclarée : {I.activity}
        <br />
        Code APE : {I.apeCode}
        <br />
        {I.vatStatus}
        <br />
        Email : {I.email}
      </Section>

      <Section variant={variant} title="Responsable de la publication">
        {I.editorDisplayName}, en sa qualité d&apos;éditrice de
        l&apos;application Foodlane.
      </Section>

      <Section variant={variant} title="Nom de domaine">
        Domaine principal du service : {I.domain}
        <br />
        Nom de domaine inscrit au Kbis : {I.kbisDomain}
      </Section>

      <Section variant={variant} title="Hébergement et infrastructure">
        L&apos;application et son infrastructure technique reposent sur les
        prestataires suivants :
        <br />
        • <strong>Vercel Inc.</strong> — 440 N Barranca Avenue #4133, Covina,
        CA 91723, USA — hébergement de l&apos;application web ({I.domain}).
        <br />
        • <strong>Supabase Inc.</strong> — 970 Toa Payoh North #07-04,
        Singapore 318992 — base de données, authentification et stockage
        utilisateur (serveurs situés au sein de l&apos;Union Européenne).
        <br />
        • <strong>Stripe Payments Europe Ltd.</strong> — 1 Grand Canal Street
        Lower, Grand Canal Dock, Dublin, Irlande — gestion des paiements et
        des abonnements.
        <br />
        • <strong>Resend, Inc.</strong> — 2261 Market Street #4818, San
        Francisco, CA 94114, USA — envoi des emails transactionnels.
        <br />
        <br />
        Les données utilisateurs sont traitées dans le respect du RGPD. Les
        serveurs sont situés au sein de l&apos;Union Européenne ou dans des
        pays bénéficiant d&apos;une décision d&apos;adéquation de la
        Commission européenne, ou encadrés par des clauses contractuelles
        types.
      </Section>

      <Section variant={variant} title="Propriété intellectuelle">
        L&apos;ensemble des contenus de l&apos;application Foodlane —
        notamment le logo, le nom Foodlane, le nom WayDia, le design,
        l&apos;interface, les recettes, textes, illustrations, codes sources
        et fonctionnalités — sont la propriété exclusive de{" "}
        {I.editorDisplayName} / {I.commercialName}, sauf mention contraire.
        <br />
        <br />
        Toute reproduction, représentation, modification, publication,
        adaptation ou exploitation, totale ou partielle, par quelque procédé
        et sur quelque support que ce soit, est strictement interdite sans
        autorisation écrite préalable, et constituerait une contrefaçon
        sanctionnée par les articles L.335-2 et suivants du Code de la
        propriété intellectuelle.
      </Section>

      <Section variant={variant} title="Objet du service">
        Foodlane est une application d&apos;accompagnement nutritionnel et
        d&apos;inspiration culinaire. Elle propose notamment :
        <br />
        • la génération de menus de la semaine personnalisés ;
        <br />
        • la création de listes de courses automatiques ;
        <br />
        • un catalogue de recettes adaptées aux préférences, allergies et
        objectifs de l&apos;utilisateur ;
        <br />
        • un assistant diététique basé sur l&apos;intelligence artificielle ;
        <br />
        • la gestion des favoris, des équivalences, et le partage de
        recettes ;
        <br />
        • selon l&apos;offre, la possibilité d&apos;analyser une photo de
        frigo ou de plat.
        <br />
        <br />
        <strong>
          Foodlane ne constitue pas un dispositif médical et ne dispense ni
          soins, ni diagnostic, ni prescription. Les conseils nutritionnels
          fournis ne remplacent pas une consultation avec un professionnel de
          santé, en particulier en cas de pathologie, grossesse, allaitement,
          trouble du comportement alimentaire (TCA), allergie sévère ou
          traitement médical.
        </strong>
      </Section>

      <Section variant={variant} title="Limitation de responsabilité">
        L&apos;éditrice met tout en œuvre pour garantir la fiabilité et
        l&apos;exactitude des informations diffusées sur l&apos;application.
        Elle ne saurait toutefois être tenue pour responsable
        d&apos;éventuelles erreurs, omissions ou indisponibilités du service.
        <br />
        <br />
        L&apos;utilisateur demeure seul responsable de l&apos;usage qu&apos;il
        fait de Foodlane, notamment au regard de ses allergies, intolérances,
        contraintes médicales ou objectifs personnels.
      </Section>

      <Section
        variant={variant}
        title="Médiation de la consommation"
      >
        Conformément aux articles L.616-1 et R.616-1 du Code de la
        consommation, l&apos;utilisateur consommateur peut recourir
        gratuitement à un dispositif de médiation en cas de litige
        n&apos;ayant pu être résolu à l&apos;amiable. Les coordonnées du
        médiateur compétent peuvent être obtenues sur simple demande à{" "}
        {I.email}.
        <br />
        <br />
        Plateforme européenne de règlement en ligne des litiges :{" "}
        <span className="underline">
          https://ec.europa.eu/consumers/odr
        </span>
        .
      </Section>

      <Section variant={variant} title="Contact">
        Pour toute demande, réclamation ou exercice des droits :
        <br />
        📧 {I.email}
        <br />
        ✉️ {I.address}
      </Section>

      <Section variant={variant} title="Dernière mise à jour">
        {I.lastUpdate}
      </Section>
    </>
  );
}

/* ============================================================
 * Conditions Générales d'Utilisation (CGU)
 * ============================================================ */

export function CGUContent({
  variant = "default",
}: { variant?: Variant } = {}) {
  const I = FOODLANE_LEGAL_INFO;
  return (
    <>
      <Section variant={variant} title="1. Objet">
        Les présentes Conditions Générales d&apos;Utilisation (ci-après «
        CGU ») ont pour objet de définir les modalités d&apos;accès et
        d&apos;utilisation de l&apos;application <strong>Foodlane</strong>,
        éditée par {I.editorDisplayName} – {I.commercialName}, dont les
        coordonnées complètes figurent dans les Mentions légales.
        <br />
        <br />
        En utilisant Foodlane, l&apos;utilisateur reconnaît avoir lu, compris
        et accepté sans réserve les présentes CGU.
      </Section>

      <Section variant={variant} title="2. Description du service">
        Foodlane est une application numérique d&apos;accompagnement
        nutritionnel et d&apos;équilibre alimentaire permettant notamment :
        <br />
        • la création et la gestion d&apos;un compte utilisateur ;
        <br />
        • la génération de menus de la semaine personnalisés ;
        <br />
        • la création de listes de courses automatiques ;
        <br />
        • la consultation d&apos;un catalogue de recettes ;
        <br />
        • la gestion des favoris et des équivalences alimentaires ;
        <br />
        • l&apos;adaptation du contenu selon les préférences, allergies,
        objectifs et composition du foyer ;
        <br />
        • un assistant diététique basé sur l&apos;intelligence artificielle ;
        <br />
        • selon l&apos;offre souscrite, l&apos;analyse de photos de frigo ou
        de plats et d&apos;autres fonctionnalités premium.
        <br />
        <br />
        <strong>
          Foodlane fournit des conseils nutritionnels généraux et
          personnalisés via un outil numérique. Foodlane ne constitue ni un
          conseil médical, ni un dispositif médical, ni une prestation de
          santé personnalisée, et ne remplace en aucun cas une consultation
          avec un professionnel de santé en cas de pathologie, grossesse,
          allaitement, trouble du comportement alimentaire (TCA), allergie
          sévère ou traitement médical.
        </strong>
      </Section>

      <Section variant={variant} title="3. Public concerné et accès">
        Foodlane est accessible à toute personne physique majeure capable de
        contracter au sens du droit français. L&apos;application est
        principalement destinée à un public francophone et résidant en France
        métropolitaine. L&apos;accès depuis d&apos;autres territoires reste
        possible mais l&apos;utilisateur est seul responsable du respect des
        législations locales applicables.
      </Section>

      <Section variant={variant} title="4. Création de compte et sécurité">
        L&apos;accès aux fonctionnalités de Foodlane nécessite la création
        d&apos;un compte utilisateur via une adresse email et un mot de passe
        (ou via un fournisseur d&apos;identité tiers le cas échéant).
        <br />
        <br />
        L&apos;utilisateur s&apos;engage à fournir des informations exactes,
        complètes et tenues à jour, et à :
        <br />
        • préserver la confidentialité de ses identifiants ;
        <br />
        • signaler sans délai toute utilisation non autorisée de son compte
        à {I.email} ;
        <br />
        • ne pas créer de compte pour un tiers sans son autorisation
        explicite ;
        <br />
        • ne pas créer plusieurs comptes pour contourner des restrictions du
        service.
      </Section>

      <Section variant={variant} title="5. Offre gratuite et offre premium">
        Foodlane propose une version gratuite, ainsi qu&apos;un ou plusieurs
        abonnements payants (notamment « Premium » et « Premium Plus »)
        offrant des fonctionnalités avancées (scan photo de frigo, listes de
        courses automatiques, recettes additionnelles, régimes alimentaires
        avancés, etc.).
        <br />
        <br />
        La version gratuite peut afficher des <strong>publicités</strong>{" "}
        fournies par <strong>Google AdSense</strong>, clairement identifiées
        comme telles. Les abonnements payants permettent de retirer ces
        publicités.
        <br />
        <br />
        Le détail des fonctionnalités, des tarifs et des conditions de
        souscription est précisé dans les Conditions Générales de Vente
        (CGV) et au sein de l&apos;application au moment de l&apos;achat.
      </Section>

      <Section variant={variant} title="6. Données personnelles">
        Foodlane collecte et traite certaines données personnelles, dont
        certaines peuvent être qualifiées de données de santé au sens de
        l&apos;article 9 du RGPD (allergies, pathologies déclarées, objectifs
        nutritionnels, etc.).
        <br />
        <br />
        Ce traitement est strictement encadré par :
        <br />
        • la <strong>Politique de Confidentialité</strong> de Foodlane ;
        <br />
        • le RGPD (Règlement (UE) 2016/679) ;
        <br />
        • la loi française « Informatique et Libertés » et les
        recommandations de la CNIL.
        <br />
        <br />
        L&apos;utilisateur peut exercer ses droits (accès, rectification,
        suppression, opposition, portabilité, retrait du consentement) à tout
        moment via {I.email}.
      </Section>

      <Section variant={variant} title="7. Utilisation responsable">
        L&apos;utilisateur s&apos;engage à :
        <br />
        • ne pas détourner l&apos;application de sa finalité ;
        <br />
        • ne pas porter atteinte au bon fonctionnement, à la sécurité ou à
        l&apos;intégrité du service ;
        <br />
        • ne pas tenter d&apos;accéder à des données ou comptes
        d&apos;autres utilisateurs ;
        <br />
        • ne pas diffuser de contenus illicites, injurieux, diffamatoires,
        discriminatoires ou attentatoires aux droits de tiers ;
        <br />
        • ne pas reproduire, copier ou revendre tout ou partie du contenu de
        Foodlane (recettes, textes, design, code, marque) ;
        <br />
        • ne pas utiliser de robots, scrapers ou autres procédés
        automatisés.
        <br />
        <br />
        L&apos;éditrice se réserve le droit de suspendre ou supprimer tout
        compte ne respectant pas les présentes CGU, sans préjudice
        d&apos;éventuelles poursuites.
      </Section>

      <Section variant={variant} title="8. Responsabilité de l'utilisateur">
        Il appartient à l&apos;utilisateur de vérifier la compatibilité des
        recommandations et recettes proposées avec :
        <br />
        • son état de santé général ;
        <br />
        • ses allergies, intolérances et restrictions alimentaires ;
        <br />
        • ses traitements médicaux éventuels ;
        <br />
        • les recommandations d&apos;un professionnel de santé qui le suit.
        <br />
        <br />
        Les informations renseignées dans le profil (objectifs, allergies,
        contraintes, foyer…) doivent être exactes et mises à jour pour
        permettre à Foodlane de proposer un contenu adapté.
      </Section>

      <Section variant={variant} title="9. Disponibilité du service">
        Foodlane est accessible 24h/24, sous réserve d&apos;opérations de
        maintenance, de mises à jour, d&apos;incidents techniques ou de
        contraintes liées aux prestataires tiers (hébergement, paiement,
        intelligence artificielle).
        <br />
        <br />
        L&apos;éditrice ne saurait être tenue responsable d&apos;une
        indisponibilité temporaire ou de la perte de données qui en
        résulterait.
      </Section>

      <Section variant={variant} title="10. Propriété intellectuelle">
        Tous les éléments de l&apos;application (interface, logo, marque
        Foodlane, marque WayDia, recettes, textes, illustrations, code, etc.)
        sont protégés par le droit d&apos;auteur, le droit des marques et
        plus généralement par la propriété intellectuelle.
        <br />
        <br />
        Aucune reproduction, représentation, modification ou exploitation
        non expressément autorisée n&apos;est permise.
      </Section>

      <Section
        variant={variant}
        title="11. Limitation de responsabilité de l'éditrice"
      >
        Foodlane fournit un outil numérique d&apos;aide à la décision et
        d&apos;inspiration alimentaire. À ce titre, l&apos;éditrice ne pourra
        être tenue responsable :
        <br />
        • des conséquences d&apos;une mauvaise utilisation de
        l&apos;application ;
        <br />
        • d&apos;une mauvaise interprétation des conseils par
        l&apos;utilisateur ;
        <br />
        • d&apos;un défaut de mise à jour du profil par
        l&apos;utilisateur ;
        <br />
        • d&apos;un dommage indirect, perte de chance ou perte de données.
      </Section>

      <Section
        variant={variant}
        title="12. Suspension et suppression du compte"
      >
        L&apos;utilisateur peut supprimer son compte à tout moment depuis
        l&apos;application ou en envoyant une demande à {I.email}. La
        suppression du compte entraîne l&apos;effacement des données
        associées, sauf obligation légale de conservation (facturation,
        comptabilité, etc.).
        <br />
        <br />
        L&apos;éditrice peut, après mise en demeure restée sans effet,
        suspendre ou supprimer un compte en cas de manquement grave aux CGU,
        de fraude, d&apos;impayé ou d&apos;usage abusif.
      </Section>

      <Section
        variant={variant}
        title="13. Évolution du service et des CGU"
      >
        L&apos;éditrice se réserve le droit de faire évoluer
        l&apos;application, ses fonctionnalités, ses tarifs et les présentes
        CGU. Les modifications substantielles seront notifiées à
        l&apos;utilisateur par tout moyen utile (email, notification dans
        l&apos;application). La poursuite de l&apos;utilisation après
        notification vaut acceptation.
      </Section>

      <Section variant={variant} title="14. Droit applicable et litiges">
        Les présentes CGU sont régies par le droit français.
        <br />
        En cas de litige, et après tentative de résolution amiable, les
        tribunaux français seront compétents, conformément aux règles
        applicables. Le consommateur conserve le droit de saisir le tribunal
        de son domicile.
      </Section>
    </>
  );
}

/* ============================================================
 * Politique de confidentialité (RGPD)
 * ============================================================ */

export function ConfidentialiteContent({
  variant = "default",
}: { variant?: Variant } = {}) {
  const I = FOODLANE_LEGAL_INFO;
  return (
    <>
      <Section
        variant={variant}
        title="1. Responsable du traitement"
      >
        L&apos;application Foodlane est éditée par :
        <br />
        <strong>{I.editorDisplayName}</strong>
        <br />
        {I.status}
        <br />
        Exerçant sous le nom commercial <strong>{I.commercialName}</strong>
        <br />
        SIRET : {I.siret} — {I.rcs}
        <br />
        Adresse : {I.address}
        <br />
        Email : {I.email}
        <br />
        <br />
        {I.editorDisplayName} agit en qualité de <strong>Responsable du
        traitement</strong> au sens du Règlement Général sur la Protection
        des Données (RGPD).
      </Section>

      <Section variant={variant} title="2. Finalités du traitement">
        Les données collectées par Foodlane sont utilisées pour :
        <br />
        • créer et gérer le compte utilisateur ;
        <br />
        • personnaliser les menus, recettes et conseils nutritionnels ;
        <br />
        • faire fonctionner l&apos;assistant diététique basé sur
        l&apos;intelligence artificielle ;
        <br />
        • exécuter et facturer les abonnements premium ;
        <br />
        • assurer le support utilisateur et répondre aux demandes ;
        <br />
        • améliorer le service, ses fonctionnalités et sa sécurité ;
        <br />
        • respecter les obligations légales (comptabilité, lutte contre la
        fraude, etc.) ;
        <br />
        • le cas échéant, envoyer des informations commerciales ou la
        newsletter aux utilisateurs ayant donné leur consentement ;
        <br />
        • afficher des publicités sur la version gratuite via Google
        AdSense, lorsque l&apos;utilisateur a donné son consentement aux
        cookies marketing.
      </Section>

      <Section variant={variant} title="3. Données collectées">
        <strong>Données de compte :</strong>
        <br />
        • nom, prénom ;
        <br />
        • adresse email ;
        <br />
        • mot de passe (chiffré, jamais stocké en clair) ;
        <br />
        • numéro de téléphone (optionnel) ;
        <br />
        • date de création du compte.
        <br />
        <br />
        <strong>Données de profil et de préférences :</strong>
        <br />
        • objectifs nutritionnels ;
        <br />
        • régime(s) alimentaire(s) ;
        <br />
        • allergies, intolérances et ingrédients exclus ;
        <br />
        • pathologies déclarées (optionnel) ;
        <br />
        • composition du foyer (nombre de personnes, enfants, etc.) ;
        <br />
        • équipements de cuisine disponibles ;
        <br />
        • budget, temps de préparation, niveau culinaire.
        <br />
        <br />
        <strong>Données nutritionnelles et d&apos;usage :</strong>
        <br />
        • menus générés, recettes consultées et favoris ;
        <br />
        • listes de courses ;
        <br />
        • photos de frigo / plats téléchargées (fonction premium) ;
        <br />
        • interactions avec l&apos;assistant IA ;
        <br />
        • historique d&apos;utilisation au sein de l&apos;application.
        <br />
        <br />
        <strong>Données de paiement :</strong>
        <br />
        Les paiements sont gérés intégralement par <strong>Stripe</strong>.
        Foodlane <em>ne stocke jamais</em> les données de carte bancaire ;
        elle conserve uniquement les informations nécessaires à la
        facturation et au suivi de l&apos;abonnement (identifiant client
        Stripe, statut, dates, montants).
        <br />
        <br />
        <strong>Données techniques :</strong>
        <br />
        • adresse IP, type de navigateur, système d&apos;exploitation ;
        <br />
        • identifiants techniques de session ;
        <br />
        • logs serveur (horodatage, page consultée, code de réponse).
        <br />
        <br />
        <strong>Données support et marketing :</strong>
        <br />
        • messages envoyés via le formulaire de contact ou par email ;
        <br />
        • inscription à la newsletter (le cas échéant) ;
        <br />
        • provenance / code de parrainage (le cas échéant).
        <br />
        <br />
        📌 Certaines de ces données (allergies, pathologies, objectifs
        nutritionnels) peuvent constituer des <strong>données de santé</strong>{" "}
        au sens de l&apos;article 9 du RGPD. Elles sont traitées :
        <br />
        • exclusivement sur la base du consentement explicite de
        l&apos;utilisateur ;
        <br />
        • pour une finalité strictement non médicale (personnalisation du
        contenu nutritionnel) ;
        <br />
        • sans aucun usage diagnostic, médical ou de profilage commercial.
      </Section>

      <Section variant={variant} title="4. Base légale du traitement">
        Conformément à l&apos;article 6 du RGPD, les traitements reposent
        sur :
        <br />
        • <strong>l&apos;exécution du contrat</strong> (art. 6.1.b) pour la
        gestion du compte, la fourniture du service et la gestion des
        abonnements ;
        <br />
        • <strong>le consentement explicite</strong> (art. 6.1.a et 9.2.a)
        pour les données de santé (allergies, pathologies, objectifs) et,
        le cas échéant, la newsletter et les cookies non essentiels ;
        <br />
        • <strong>l&apos;intérêt légitime</strong> (art. 6.1.f) pour la
        sécurité du service, la prévention de la fraude et
        l&apos;amélioration de l&apos;application ;
        <br />
        • <strong>l&apos;obligation légale</strong> (art. 6.1.c) pour la
        conservation des factures et obligations comptables.
        <br />
        <br />
        Le consentement peut être retiré à tout moment via les paramètres
        du compte ou par email à {I.email}.
      </Section>

      <Section
        variant={variant}
        title="5. Destinataires et sous-traitants"
      >
        Les données sont destinées à l&apos;éditrice de Foodlane et à ses
        sous-traitants techniques, strictement nécessaires au fonctionnement
        du service :
        <br />
        <br />
        • <strong>Supabase Inc.</strong> — base de données,
        authentification, stockage (serveurs UE). Sous-traitant principal.
        <br />
        • <strong>Vercel Inc.</strong> (USA) — hébergement de
        l&apos;application web et logs techniques.
        <br />
        • <strong>Stripe Payments Europe Ltd.</strong> (Irlande, UE) —
        gestion des paiements, des abonnements et de la facturation.
        <br />
        • <strong>Resend, Inc.</strong> (USA) — envoi des emails
        transactionnels (réinitialisation de mot de passe, support,
        confirmations).
        <br />
        • <strong>OpenAI, L.L.C.</strong> (USA) — fournisseur de modèles
        d&apos;intelligence artificielle utilisés pour la génération de
        menus, recettes, conseils et analyses d&apos;images. Les données
        transmises sont limitées au strict nécessaire et ne sont pas
        utilisées pour ré-entraîner les modèles publics.
        <br />
        • <strong>Refgrow</strong> — uniquement le cas échéant, pour la
        gestion du programme de parrainage et d&apos;affiliation.
        <br />
        • <strong>Google Ireland Limited / Google LLC</strong> (USA) —
        diffusion de publicités via <strong>Google AdSense</strong> sur la
        version gratuite, lorsque l&apos;utilisateur a accepté les cookies
        marketing. Google peut déposer des cookies ou utiliser des
        identifiants similaires pour mesurer et personnaliser les annonces.
        <br />
        <br />
        Pour en savoir plus sur l&apos;utilisation des données par Google
        dans ce cadre :{" "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#E94E77] underline underline-offset-2 hover:text-[#D63D56]"
        >
          Comment Google utilise les données des sites ou applications
          partenaires
        </a>
        .
        <br />
        <br />
        Aucune donnée n&apos;est revendue, louée ou cédée à des tiers à des
        fins commerciales.
      </Section>

      <Section
        variant={variant}
        title="6. Transferts hors Union européenne"
      >
        Certains sous-traitants (Vercel, Resend, OpenAI) sont situés aux
        États-Unis. Les transferts éventuels de données vers ces
        prestataires sont encadrés par :
        <br />
        • le <strong>Data Privacy Framework</strong> UE — États-Unis lorsque
        le prestataire y est certifié ;
        <br />
        • les <strong>clauses contractuelles types</strong> (CCT) adoptées
        par la Commission européenne ;
        <br />
        • des mesures techniques complémentaires (chiffrement,
        pseudonymisation lorsque pertinent).
        <br />
        <br />
        Les serveurs Supabase utilisés par Foodlane sont localisés au sein
        de l&apos;Union européenne.
      </Section>

      <Section variant={variant} title="7. Durée de conservation">
        • <strong>Données de compte</strong> : jusqu&apos;à la suppression du
        compte par l&apos;utilisateur ou après 3 ans d&apos;inactivité
        complète (sauf opposition à cette suppression automatique) ;
        <br />
        • <strong>Données de préférences et profils</strong> : pendant
        toute la durée d&apos;utilisation, puis supprimées avec le compte ;
        <br />
        • <strong>Données de facturation</strong> : 10 ans à compter de
        l&apos;émission de la facture (obligation comptable) ;
        <br />
        • <strong>Logs techniques</strong> : 12 mois maximum ;
        <br />
        • <strong>Données support</strong> : 3 ans après le dernier
        échange ;
        <br />
        • <strong>Photos téléchargées par l&apos;utilisateur</strong> :
        conservées le temps de leur exploitation puis supprimées (en
        général au terme de la session ou sous quelques jours), sauf
        sauvegarde explicite par l&apos;utilisateur dans son profil ;
        <br />
        • <strong>Newsletter / marketing</strong> : jusqu&apos;à
        désinscription puis 3 ans à compter du dernier contact.
      </Section>

      <Section variant={variant} title="8. Sécurité">
        L&apos;éditrice met en œuvre des mesures techniques et
        organisationnelles adaptées pour protéger les données :
        <br />
        • authentification sécurisée et hachage des mots de passe ;
        <br />
        • communications chiffrées (HTTPS / TLS) ;
        <br />
        • restriction des accès aux seules personnes habilitées ;
        <br />
        • sauvegardes régulières ;
        <br />
        • séparation des environnements et journalisation des accès
        sensibles.
      </Section>

      <Section variant={variant} title="9. Droits des utilisateurs">
        Conformément au RGPD et à la loi « Informatique et Libertés »,
        l&apos;utilisateur dispose des droits suivants :
        <br />
        • droit d&apos;accès ;
        <br />
        • droit de rectification ;
        <br />
        • droit à l&apos;effacement (« droit à l&apos;oubli ») ;
        <br />
        • droit à la limitation du traitement ;
        <br />
        • droit à la portabilité ;
        <br />
        • droit d&apos;opposition ;
        <br />
        • droit de retirer son consentement à tout moment ;
        <br />
        • droit de définir des directives relatives au sort de ses données
        après son décès.
        <br />
        <br />
        Ces droits peuvent être exercés en écrivant à : 📧 {I.email}
        <br />
        Adresse postale : {I.address}
        <br />
        <br />
        En cas de réclamation, l&apos;utilisateur peut saisir la CNIL :
        <br />
        👉 www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex
        07.
      </Section>

      <Section variant={variant} title="10. Cookies et traceurs">
        L&apos;application et le site Foodlane peuvent utiliser des cookies
        et traceurs. Leur usage, leur finalité et les modalités de
        consentement sont décrits dans la <strong>Politique de
        cookies</strong>.
      </Section>

      <Section variant={variant} title="11. Modification de la politique">
        La présente politique peut être mise à jour pour refléter
        l&apos;évolution du service ou de la réglementation. La version
        applicable est celle disponible dans l&apos;application ou sur le
        site au moment de l&apos;utilisation. En cas de modification
        substantielle, l&apos;utilisateur sera informé par tout moyen utile.
      </Section>

      <Section variant={variant} title="12. Contact">
        Pour toute question relative à vos données personnelles :
        <br />
        📧 {I.email}
        <br />
        ✉️ {I.address}
        <br />
        <br />
        Dernière mise à jour : {I.lastUpdate}.
      </Section>
    </>
  );
}

/* ============================================================
 * Conditions Générales de Vente (CGV)
 * ============================================================ */

export function CGVContent({
  variant = "default",
}: { variant?: Variant } = {}) {
  const I = FOODLANE_LEGAL_INFO;
  return (
    <>
      <Section variant={variant} title="1. Objet et champ d'application">
        Les présentes Conditions Générales de Vente (« CGV ») régissent les
        ventes d&apos;abonnements et de services numériques proposés par
        l&apos;éditrice de Foodlane :
        <br />
        <strong>{I.editorDisplayName}</strong> — {I.commercialName}
        <br />
        {I.address}
        <br />
        SIREN : {I.siren} — {I.rcs}
        <br />
        Email : {I.email}
        <br />
        <br />
        Elles s&apos;appliquent à toute commande passée via
        l&apos;application Foodlane ou le site {I.domain}. Toute
        souscription emporte acceptation pleine et entière des présentes CGV
        ainsi que des CGU et de la Politique de confidentialité.
      </Section>

      <Section variant={variant} title="2. Offres et fonctionnalités">
        Foodlane propose :
        <br />
        • une <strong>version gratuite</strong> avec un accès limité à
        certaines fonctionnalités ;
        <br />
        • un abonnement <strong>Foodlane Premium</strong> (mensuel ou
        annuel) ;
        <br />
        • un abonnement <strong>Foodlane Premium Plus</strong> avec des
        fonctionnalités supplémentaires.
        <br />
        <br />
        Le détail des fonctionnalités incluses, des éventuelles offres de
        lancement et des codes promotionnels en cours est présenté dans
        l&apos;application au moment de la souscription.
      </Section>

      <Section variant={variant} title="3. Prix">
        Les prix sont indiqués en euros (€), toutes taxes comprises (TTC).
        <br />
        En application de l&apos;article 293 B du Code général des impôts,{" "}
        {I.editorDisplayName} bénéficie de la franchise en base de TVA :
        « TVA non applicable, art. 293 B du CGI ».
        <br />
        <br />
        Les prix applicables sont ceux affichés au moment de la
        souscription. L&apos;éditrice se réserve le droit de modifier ses
        tarifs à tout moment ; les nouveaux tarifs ne s&apos;appliquent
        toutefois qu&apos;aux nouvelles souscriptions ou au renouvellement
        des abonnements en cours, après information préalable de
        l&apos;utilisateur.
      </Section>

      <Section variant={variant} title="4. Paiement">
        Les paiements sont gérés via la plateforme sécurisée{" "}
        <strong>Stripe Payments Europe Ltd.</strong> (Dublin, Irlande). Les
        moyens de paiement acceptés sont notamment : carte bancaire (CB,
        Visa, Mastercard, American Express selon disponibilité) et tout
        autre moyen proposé par Stripe.
        <br />
        <br />
        Foodlane <strong>ne stocke jamais</strong> les données bancaires
        des utilisateurs. Celles-ci sont traitées et conservées
        exclusivement par Stripe, certifié PCI-DSS niveau 1.
        <br />
        <br />
        Le paiement est exigible immédiatement à la souscription pour les
        abonnements à durée mensuelle ou annuelle, puis à chaque
        renouvellement automatique.
      </Section>

      <Section
        variant={variant}
        title="5. Souscription, durée et renouvellement"
      >
        Les abonnements sont conclus pour une durée mensuelle ou annuelle,
        selon le choix de l&apos;utilisateur, et se renouvellent
        automatiquement par tacite reconduction à l&apos;issue de chaque
        période, sauf résiliation préalable.
        <br />
        <br />
        L&apos;utilisateur peut consulter et gérer son abonnement
        directement depuis :
        <br />
        → la section « Abonnement » de l&apos;application Foodlane ;
        <br />
        → le <strong>portail client Stripe</strong> accessible depuis
        l&apos;application ;
        <br />
        → ou en écrivant à {I.email}.
      </Section>

      <Section variant={variant} title="6. Résiliation">
        L&apos;utilisateur peut résilier son abonnement à tout moment, sans
        frais et sans justification, depuis le portail client Stripe
        accessible dans l&apos;application, ou par email à {I.email}.
        <br />
        <br />
        La résiliation prend effet à la fin de la période d&apos;abonnement
        en cours : aucune nouvelle échéance ne sera prélevée mais
        l&apos;utilisateur conserve l&apos;accès aux fonctionnalités
        premium jusqu&apos;à la fin de la période déjà payée.
      </Section>

      <Section
        variant={variant}
        title="7. Droit de rétractation (14 jours)"
      >
        Conformément aux articles L.221-18 et suivants du Code de la
        consommation, le consommateur dispose d&apos;un délai de{" "}
        <strong>14 jours calendaires</strong> à compter de la conclusion du
        contrat pour exercer son droit de rétractation, sans avoir à
        justifier de motif ni à supporter de pénalités.
        <br />
        <br />
        Pour exercer ce droit, l&apos;utilisateur peut adresser une demande
        non équivoque à {I.email} en indiquant ses nom, prénom, email du
        compte et la commande concernée.
        <br />
        <br />
        <strong>
          Exception – contenu numérique fourni immédiatement (art. L.221-28
          13°) :
        </strong>{" "}
        Foodlane fournit un service numérique d&apos;accès immédiat.
        Conformément à l&apos;article L.221-28 13° du Code de la
        consommation, l&apos;utilisateur est informé qu&apos;en souscrivant
        à un abonnement avec accès immédiat aux fonctionnalités premium et
        en commençant à utiliser le service avant la fin du délai de
        rétractation, il <strong>renonce expressément à son droit de
        rétractation</strong>. Cette renonciation est confirmée au moment
        de la souscription et l&apos;utilisateur reconnaît avoir été
        informé de la perte de ce droit.
        <br />
        <br />
        Si l&apos;utilisateur n&apos;a pas commencé à utiliser le service,
        il pourra exercer son droit de rétractation et obtenir le
        remboursement intégral des sommes versées dans un délai de 14 jours
        à compter de la décision de rétractation.
      </Section>

      <Section variant={variant} title="8. Remboursement">
        Hors cas de rétractation valablement exercée (cf. article 7) ou de
        défaut grave imputable au service, les sommes versées au titre
        d&apos;une période d&apos;abonnement entamée ne sont en principe pas
        remboursées.
        <br />
        <br />
        L&apos;éditrice peut toutefois accorder un geste commercial, à sa
        seule discrétion, sur demande motivée adressée à {I.email}.
      </Section>

      <Section variant={variant} title="9. Facturation">
        Une facture électronique est générée automatiquement à chaque
        paiement et mise à disposition depuis le portail client Stripe
        accessible dans l&apos;application. Une copie peut être obtenue sur
        demande à {I.email}.
      </Section>

      <Section
        variant={variant}
        title="10. Suspension et suppression du compte"
      >
        En cas de manquement de l&apos;utilisateur aux présentes CGV ou aux
        CGU (impayé, fraude, usage abusif, etc.), l&apos;éditrice se réserve
        la possibilité, après mise en demeure restée sans effet, de
        suspendre ou supprimer le compte, sans préjudice de toute action
        complémentaire.
      </Section>

      <Section variant={variant} title="11. Disponibilité et conformité">
        L&apos;éditrice met tout en œuvre pour garantir la disponibilité et
        la conformité du service. Toutefois, des interruptions peuvent
        survenir pour maintenance, mises à jour ou en raison de contraintes
        liées aux prestataires tiers (hébergeur, Stripe, fournisseur
        d&apos;IA). De telles interruptions ne donnent pas lieu à
        indemnisation.
      </Section>

      <Section variant={variant} title="12. Support client">
        Le support utilisateur est joignable à : 📧 {I.email}
        <br />
        Délai indicatif de réponse : sous 5 jours ouvrés.
      </Section>

      <Section
        variant={variant}
        title="13. Responsabilité"
      >
        Foodlane est un outil d&apos;aide à la décision et d&apos;inspiration
        alimentaire. L&apos;éditrice ne saurait être tenue responsable :
        <br />
        • des conséquences d&apos;une mauvaise utilisation du service ;
        <br />
        • d&apos;une mauvaise interprétation des conseils ;
        <br />
        • d&apos;un dommage indirect ou d&apos;une perte de chance ;
        <br />
        • des défaillances liées aux plateformes tierces (Stripe, Apple,
        Google, Vercel, OpenAI, etc.).
        <br />
        <br />
        Foodlane <strong>ne remplace pas</strong> une consultation avec un
        professionnel de santé.
      </Section>

      <Section variant={variant} title="14. Médiation de la consommation">
        Conformément aux articles L.616-1 et R.616-1 du Code de la
        consommation, le consommateur peut recourir gratuitement à un
        dispositif de médiation en cas de litige. Les coordonnées du
        médiateur compétent sont communiquées sur demande à {I.email}.
        <br />
        <br />
        Plateforme européenne de règlement en ligne des litiges :
        https://ec.europa.eu/consumers/odr
      </Section>

      <Section variant={variant} title="15. Droit applicable et litiges">
        Les présentes CGV sont régies par le droit français. À défaut de
        résolution amiable, les tribunaux français seront compétents
        conformément aux règles applicables. Le consommateur conserve le
        droit de saisir le tribunal de son domicile.
      </Section>

      <Section variant={variant} title="Dernière mise à jour">
        {I.lastUpdate}
      </Section>
    </>
  );
}

/* ============================================================
 * Politique de cookies
 * ============================================================ */

export function CookiesContent({
  variant = "default",
}: { variant?: Variant } = {}) {
  const I = FOODLANE_LEGAL_INFO;
  return (
    <>
      <Section variant={variant} title="1. Qu'est-ce qu'un cookie ?">
        Un cookie est un petit fichier texte déposé sur le terminal de
        l&apos;utilisateur (ordinateur, téléphone, tablette) lors de la
        consultation d&apos;un site web ou d&apos;une application. Il permet
        de stocker certaines informations relatives à la navigation et, le
        cas échéant, de reconnaître l&apos;utilisateur lors de visites
        ultérieures.
        <br />
        <br />
        La présente politique décrit les cookies et technologies similaires
        utilisés par Foodlane, leur finalité, leur durée de vie et la
        manière dont l&apos;utilisateur peut gérer ses choix.
      </Section>

      <Section variant={variant} title="2. Cookies strictement nécessaires">
        Ces cookies sont indispensables au fonctionnement du service et ne
        nécessitent pas de consentement :
        <br />
        • <strong>Session et authentification</strong> (Supabase) : maintien
        de la session utilisateur connectée — durée de la session, jusqu&apos;à
        7 jours après la dernière connexion.
        <br />
        • <strong>Sécurité</strong> : protection contre la fraude, le
        détournement de session et les attaques CSRF.
        <br />
        • <strong>Préférences techniques</strong> : langue, thème, choix
        d&apos;affichage — jusqu&apos;à 12 mois.
        <br />
        • <strong>Mémorisation du consentement aux cookies</strong> — 6 mois
        à 13 mois.
      </Section>

      <Section variant={variant} title="3. Cookies de paiement">
        Lors d&apos;une souscription ou d&apos;un paiement,{" "}
        <strong>Stripe</strong> dépose des cookies strictement nécessaires
        au traitement sécurisé de la transaction et à la prévention de la
        fraude. Ces cookies sont indispensables et exemptés de
        consentement, mais leur usage est strictement limité à
        l&apos;exécution du paiement.
      </Section>

      <Section
        variant={variant}
        title="4. Cookies de mesure d'audience"
      >
        Foodlane peut utiliser des outils de mesure d&apos;audience pour
        comprendre l&apos;utilisation du service et l&apos;améliorer.
        <br />
        <br />
        À ce jour, l&apos;application n&apos;utilise <strong>aucun outil
        de mesure d&apos;audience tiers</strong> (pas de Google Analytics,
        Plausible, PostHog, Vercel Analytics activé). Si un tel outil
        venait à être ajouté, il serait soumis au consentement préalable de
        l&apos;utilisateur via une bannière de consentement, et la présente
        politique serait mise à jour en conséquence.
      </Section>

      <Section variant={variant} title="5. Cookies publicitaires (Google AdSense)">
        Sur la version gratuite de Foodlane, des publicités peuvent être
        diffusées via <strong>Google AdSense</strong> (Google Ireland
        Limited / Google LLC).
        <br />
        <br />
        • <strong>Finalité</strong> : affichage de publicités, mesure de
        performance des annonces, limitation de la fréquence d&apos;affichage,
        lutte contre la fraude publicitaire.
        <br />
        • <strong>Consentement</strong> : le script AdSense et les cookies
        associés ne sont chargés qu&apos;après acceptation de la catégorie
        « Marketing » dans la bannière de consentement.
        <br />
        • <strong>Durée</strong> : variable selon Google (généralement de
        quelques minutes à 24 mois selon le cookie).
        <br />
        <br />
        Pour en savoir plus sur l&apos;utilisation des données par Google :{" "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#E94E77] underline underline-offset-2 hover:text-[#D63D56]"
        >
          Comment Google utilise les données des sites ou applications
          partenaires
        </a>
        .
      </Section>

      <Section variant={variant} title="6. Cookies de parrainage / affiliation">
        Le programme de parrainage et d&apos;affiliation est géré par
        l&apos;outil <strong>Refgrow</strong>, qui peut déposer un cookie
        permettant d&apos;attribuer une inscription à un parrain ou un
        affilié.
        <br />
        • Finalité : attribution d&apos;un parrainage / d&apos;une
        commission d&apos;affiliation.
        <br />
        • Durée : jusqu&apos;à 90 jours après le clic initial.
        <br />
        • Consentement : le script Refgrow n&apos;est chargé qu&apos;après
        acceptation de la catégorie « Parrainage / affiliation » dans la
        bannière de consentement.
      </Section>

      <Section
        variant={variant}
        title="7. Cookies tiers (vidéo, réseaux sociaux)"
      >
        Foodlane peut, le cas échéant, intégrer des contenus tiers
        (vidéos YouTube, publications Instagram ou TikTok). Le simple
        affichage de ces contenus peut entraîner le dépôt de cookies par
        ces plateformes, sur lesquels Foodlane n&apos;a pas de contrôle. Le
        consentement est alors requis avant le chargement de ces contenus.
      </Section>

      <Section variant={variant} title="8. Gestion du consentement">
        Lors de la première visite, une bannière de consentement permet à
        l&apos;utilisateur :
        <br />
        • d&apos;accepter tous les cookies ;
        <br />
        • de refuser tous les cookies non essentiels ;
        <br />
        • de personnaliser ses choix par finalité.
        <br />
        <br />
        L&apos;utilisateur peut à tout moment modifier ses choix grâce au
        bouton ci-dessous, depuis les paramètres de son navigateur, ou en
        écrivant à {I.email}.
        <br />
        <br />
        <button
          type="button"
          onClick={() => openCookieConsentBanner()}
          className="inline-flex items-center rounded-xl bg-[#E94E77] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D63D56] transition-colors"
        >
          Modifier mes choix cookies
        </button>
        <br />
        <br />
        Le refus des cookies non essentiels n&apos;empêche pas
        l&apos;utilisation du service ; seules certaines fonctionnalités
        accessoires peuvent être limitées.
      </Section>

      <Section variant={variant} title="9. Durée du consentement">
        Le consentement (ou refus) est conservé pour une durée maximale de
        <strong> 13 mois</strong>, conformément aux recommandations de la
        CNIL. À l&apos;issue de cette période, le consentement est de
        nouveau sollicité.
      </Section>

      <Section variant={variant} title="10. Pour en savoir plus">
        Pour plus d&apos;informations sur les cookies et leur gestion :
        <br />
        👉 www.cnil.fr
        <br />
        <br />
        Pour toute question relative aux cookies utilisés par Foodlane :
        📧 {I.email}.
        <br />
        <br />
        Dernière mise à jour : {I.lastUpdate}.
      </Section>
    </>
  );
}
