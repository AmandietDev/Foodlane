# Affiliation Refgrow (Foodlane)

## Rôle de chaque brique

| Brique | Rôle |
|--------|------|
| **`latest.js`** (dans `app/layout.tsx`) | Pose le cookie quand quelqu’un arrive avec `?ref=CODE` sur **foodlane.fr**. |
| **Bandeau** `RefgrowReferralHint` | Indique visuellement qu’un lien `ref` / cookie a été détecté (fermable). |
| **`/api/create-checkout-session`** | Lit le cookie `refgrow_ref_code` et envoie **`referral_code`** dans les metadata Stripe. |
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
2. Paiement test → metadata session Stripe **`referral_code`** si le cookie était présent.  
3. Refgrow Dashboard → clics / inscriptions / ventes selon leur doc.

## Fichiers principaux

- `app/layout.tsx` — script Refgrow + hint  
- `app/api/create-checkout-session/route.ts` — metadata parrainage  
- `app/parrainage/page.tsx` — accès serveur + allowlist  
- `app/src/lib/refgrowClient.ts` — `Refgrow(0, 'signup', email)`  
- `app/src/lib/affiliateDashboardAllowlist.ts` — parse `AFFILIATE_DASHBOARD_EMAILS`  
- `app/src/lib/safeNextRedirect.ts` — `?next=` sécurisé après login  
