# Affiliation Refgrow (Foodlane)

## Rôle de chaque brique

| Brique | Rôle |
|--------|------|
| **`latest.js`** (dans `app/layout.tsx`) | Pose le cookie quand quelqu’un arrive avec `?ref=CODE` sur **foodlane.fr**. |
| **Bandeau** `RefgrowReferralHint` | Indique visuellement qu’un lien `ref` / cookie a été détecté (fermable). |
| **`/api/create-checkout-session`** | Lit le cookie `refgrow_ref_code` (ou l’en-tête `Cookie`) et envoie **`referral_code`** + **`client_reference_id`** dans Stripe (session + `subscription_data.metadata`). |
| **`refgrowTrackSignup`** (`login` + `compte`) | Après inscription, signale l’email à Refgrow pour l’attribution « parrain → inscription ». |
| **`/parrainage`** | Widget Refgrow **uniquement** si ton email est dans **`AFFILIATE_DASHBOARD_EMAILS`** (Vercel + `.env.local`). Pas de lien dans le menu. |
| **https://foodlane.refgrow.com** | Portail Refgrow pour les influenceurs (compte Refgrow, pas Foodlane). |

## Variables d’environnement

- **`NEXT_PUBLIC_REFGRROW_PROJECT_ID`** — ex. `899` (obligatoire pour le tracking + widget).
- **`AFFILIATE_DASHBOARD_EMAILS`** — emails séparés par des virgules, **même** compte que la connexion Foodlane, pour autoriser `/parrainage` dans l’app. Si vide : personne ne voit le widget dans l’app (normal pour un programme fermé).

## Connexion puis parrainage (interne)

Lien utile : **`/login?next=/parrainage`** — après connexion réussie, redirection vers `/parrainage` (si ton email est dans la allowlist).

## Vérifications rapides

1. `https://foodlane.fr?ref=TEST` → bandeau ou cookie `refgrow_ref_code` (DevTools → Application → Cookies).  
2. Paiement test → dans Stripe (mode test ou live **selon la clé** utilisée par l’app), ouvrir la **Checkout Session** : **`metadata.referral_code`** et **`client_reference_id`** si le cookie était présent au moment du paiement.  
3. Refgrow Dashboard → clics / inscriptions / ventes.

## Ventes à 0 alors que les clics montent (très fréquent)

### 1. Webhooks Stripe : Refgrow **et** ton app

Stripe peut envoyer **plusieurs** URL de webhook pour le **même compte**. Il faut que **Refgrow** reçoive bien les événements de paiement (sinon il ne peut pas enregistrer de « sale »), **en plus** de ton endpoint Foodlane (`/api/webhooks/stripe`) si tu l’utilises.

- Dans **Stripe** → **Developers** → **Webhooks** : vérifie qu’il existe un endpoint du type **`https://refgrow.com/webhook/stripe/...`** (souvent créé quand tu connectes Stripe dans Refgrow), avec au minimum : `checkout.session.completed`, `invoice.paid`, `customer.subscription.*`, etc. (voir [doc Refgrow Stripe](https://refgrow.com/docs/stripe)).
- Dans les **logs de livraison** Stripe, vérifie que les événements vers Refgrow sont **200** (pas 4xx/5xx).

### 2. Même mode Stripe (test vs live)

La clé **`STRIPE_SECRET_KEY`** sur Vercel doit être du **même mode** (test ou live) que le compte où Refgrow est branché. Un paiement **test** n’apparaît pas sur le dashboard **live** Refgrow si l’intégration pointe sur l’autre mode.

### 3. Cookie encore présent au moment du checkout

Le code parrain est lu **sur le serveur** au moment où l’API crée la session. Il faut :

- arriver sur le site avec **`?ref=CODE`** (cookie posé sur **le même domaine** que celui qui appelle l’API, ex. `www` vs sans `www` : rester cohérent),
- lancer le checkout **sans** avoir effacé les cookies / session trop courte.

### 4. Flux « inscription puis achat »

Refgrow peut aussi attribuer par **email** si `Refgrow(0, 'signup', email)` a été appelé après inscription. Si tu testes seulement « clic → achat » sans signup tracké, repose-toi surtout sur **metadata + webhooks Refgrow**.

## Fichiers principaux

- `app/layout.tsx` — script Refgrow + hint  
- `app/api/create-checkout-session/route.ts` — metadata parrainage  
- `app/parrainage/page.tsx` — accès serveur + allowlist  
- `app/src/lib/refgrowClient.ts` — `Refgrow(0, 'signup', email)`  
- `app/src/lib/affiliateDashboardAllowlist.ts` — parse `AFFILIATE_DASHBOARD_EMAILS`  
- `app/src/lib/safeNextRedirect.ts` — `?next=` sécurisé après login  
