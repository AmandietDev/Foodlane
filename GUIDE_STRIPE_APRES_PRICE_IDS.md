# Guide pas à pas : après avoir récupéré tes Price IDs Stripe

Tu as déjà créé tes **produits** et **prix** dans Stripe et tu possèdes les identifiants `price_...`. Ce document enchaîne **exactement** dans l’ordre, pour brancher Foodlane (checkout + webhook + Supabase).

Les montants affichés sur le site viennent de `app/src/lib/pricingPlans.ts` : ils doivent **correspondre** aux montants des prix Stripe (ex. 7,99 € / mois et 79,99 € / an pour Premium).

---

## Étape 1 — Fichier `.env.local`

1. À la **racine** du projet (à côté de `package.json`), crée ou ouvre le fichier **`.env.local`**.
2. Vérifie que ce fichier est **ignoré par Git** (normalement via `.gitignore`) : ne le commite pas.

---

## Étape 2 — Coller les variables Stripe (4 Price IDs)

Le checkout (`/api/create-checkout-session`) choisit le prix selon **`tier`** (`premium` | `premium_plus`) et **`interval`** (`monthly` | `yearly`).

| Palier | Mensuel | Annuel |
|--------|---------|--------|
| Premium | `STRIPE_PRICE_ID_PREMIUM_MENSUEL` | `STRIPE_PRICE_ID_PREMIUM_ANNUEL` |
| Premium Plus | `STRIPE_PRICE_ID_PREMIUM_PLUS_MENSUEL` | `STRIPE_PRICE_ID_PREMIUM_PLUS_ANNUEL` |

Exemple (remplace par **tes** vrais `price_...`) :

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_PREMIUM_MENSUEL=price_...
STRIPE_PRICE_ID_PREMIUM_ANNUEL=price_...
STRIPE_PRICE_ID_PREMIUM_PLUS_MENSUEL=price_...
STRIPE_PRICE_ID_PREMIUM_PLUS_ANNUEL=price_...
```

- Récupère **`STRIPE_SECRET_KEY`** : Stripe Dashboard → **Developers** → **API keys** → **Secret key** (`sk_test_...` en test, `sk_live_...` en production).
- **Pas d’espace** autour du `=` ; une variable par ligne.

### Colonnes Supabase associées

Après paiement, le webhook remplit notamment `subscription_tier`, `premium_plan` (intervalle), `subscription_status`, `premium_started_at`, etc. Applique la migration **`supabase/migrations/020_profiles_subscription_tier_status.sql`** sur ton projet Supabase si ce n’est pas déjà fait.

---

## Étape 3 — Supabase (obligatoire pour le webhook)

Le webhook met à jour la table **`profiles`** avec une clé **service_role** (jamais côté navigateur).

Ajoute dans `.env.local` (si ce n’est pas déjà fait) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- **Service role** : Supabase → **Project Settings** → **API** → **service_role** (secret).

Sans `SUPABASE_SERVICE_ROLE_KEY`, le webhook renverra une erreur côté serveur et Premium ne s’activera pas après paiement.

---

## Étape 4 — URL de l’app

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

En production : `https://ton-domaine.com` (utilisé comme repli pour l’origine du checkout si besoin).

---

## Étape 5 — Webhook Stripe

Stripe doit appeler ton endpoint : **`/api/webhooks/stripe`**.

### Option A — Production (recommandé une fois déployé)

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL** : `https://TON-DOMAINE.com/api/webhooks/stripe`  
   (ex. `https://ton-app.vercel.app/api/webhooks/stripe`)
3. **Événements à envoyer** : sélectionne au minimum ceux gérés par `app/api/webhooks/stripe/route.ts` :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Enregistre l’endpoint, puis ouvre-le et copie le **Signing secret** (`whsec_...`).
5. Ajoute dans `.env.local` (et sur ton hébergeur) :

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Option B — Test en local avec Stripe CLI

1. Installe la [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. `stripe login`
3. Dans un terminal :  
   `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
4. La CLI affiche un **webhook signing secret** temporaire (`whsec_...`) : mets-le dans **`STRIPE_WEBHOOK_SECRET`** le temps du test local.

---

## Étape 6 — Redémarrer Next.js

Les variables d’environnement sont lues **au démarrage**.

1. Arrête le serveur (**Ctrl+C**).
2. Relance : `npm run dev`.

---

## Étape 7 — Tester le parcours complet

1. Connecte-toi sur l’app → page **`/premium`**.
2. Choisis **Mensuel** ou **Annuel** → teste **Premium** puis **Premium Plus** (boutons distincts).
3. Paiement test : carte **`4242 4242 4242 4242`**, date future, CVC au choix ([doc Stripe Testing](https://stripe.com/docs/testing)).
4. Après succès : redirection vers **`/billing/success`** (défini dans `create-checkout-session`).
5. Vérifie dans **Supabase** → **`profiles`** : `premium_active`, `subscription_tier` (`premium` / `premium_plus`), `premium_plan` (`monthly` / `yearly`), `subscription_status`, `stripe_*`, `premium_started_at`.
6. Dans Stripe → **Webhooks** → **Recent deliveries** : statut **2xx** sur `checkout.session.completed`.

---

## Étape 8 — Déploiement (Vercel ou autre)

Reprends **les mêmes noms** de variables dans le tableau des variables d’environnement du projet :

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PREMIUM_MENSUEL`
- `STRIPE_PRICE_ID_PREMIUM_ANNUEL`
- `STRIPE_PRICE_ID_PREMIUM_PLUS_MENSUEL`
- `STRIPE_PRICE_ID_PREMIUM_PLUS_ANNUEL`
- `STRIPE_WEBHOOK_SECRET` (**secret du webhook qui pointe vers l’URL de prod**, distinct du secret CLI local)
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` = URL publique de l’app

En **live**, recrée des prix / webhooks en mode **live** et utilise les clés **`sk_live_...`**.

---

## Dépannage rapide

| Symptôme | Piste |
|----------|--------|
| Erreur « Price ID manquant » / configuration incomplète | Vérifier les **quatre** variables `STRIPE_PRICE_ID_PREMIUM_*` et `STRIPE_PRICE_ID_PREMIUM_PLUS_*` ; redémarrer le serveur après `.env.local`. |
| Paiement OK mais pas Premium | Webhook : URL incorrecte, `STRIPE_WEBHOOK_SECRET` faux, ou `SUPABASE_SERVICE_ROLE_KEY` manquant ; migration `020_profiles_subscription_tier_status.sql` non appliquée. |
| Profil non mis à jour | L’utilisateur doit exister dans **`profiles`** avec le bon **id** (metadata `userId` sur la session checkout). |

---

## Guides complémentaires dans le dépôt

- **`STRIPE_SUPABASE_SETUP_SIMPLE.md`** — vue d’ensemble Stripe ↔ Supabase (création produits, table `profiles`, dépannage).
- **`CONFIGURATION_RAPIDE_STRIPE.md`** — rappel des variables et redémarrage.

Une fois ces étapes faites, ton flux **Price IDs → `.env` → webhook → Supabase** est complet pour **Premium** et **Premium Plus**.
