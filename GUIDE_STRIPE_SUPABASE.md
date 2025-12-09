# 🔗 Guide : Intégration Stripe ↔ Supabase pour Premium

Ce guide explique comment configurer l'intégration complète entre Stripe et Supabase pour gérer les abonnements Premium.

---

## 📋 Prérequis

- ✅ Compte Stripe créé
- ✅ Compte Supabase créé
- ✅ Table `profiles` (ou `profils`) dans Supabase
- ✅ Package `stripe` installé (`npm install stripe`)

---

## 🔵 ÉTAPE 1 : Mettre à jour le schéma Supabase

### 1.1 Exécuter le SQL de migration

1. Va sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionne ton projet
3. Va dans **"SQL Editor"** (dans le menu de gauche)
4. Clique sur **"New query"**
5. Ouvre le fichier `SUPABASE_MIGRATION_PROFILS.sql` dans ton projet
6. **Copie-colle tout le contenu** dans l'éditeur SQL
7. Clique sur **"Run"** (ou `Ctrl+Enter`)

⚠️ **Important** : Si ta table s'appelle `profiles` (en anglais) et non `profils`, remplace `profils` par `profiles` dans le SQL avant d'exécuter.

### 1.2 Vérifier les colonnes créées

Après l'exécution, tu devrais voir un tableau avec les colonnes suivantes :
- `email` (TEXT)
- `premium_active` (BOOLEAN, NOT NULL, DEFAULT false)
- `premium_start_date` (TIMESTAMPTZ)
- `premium_end_date` (TIMESTAMPTZ)
- `stripe_customer_id` (TEXT)
- `stripe_subscription_id` (TEXT)

---

## 🔵 ÉTAPE 2 : Récupérer les clés Supabase Service Role

La clé Service Role permet au webhook de bypasser les RLS (Row Level Security) et de mettre à jour les profils directement.

1. Va sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionne ton projet
3. Va dans **"Settings"** (⚙️ en bas à gauche)
4. Clique sur **"API"**
5. Dans la section **"Project API keys"**, trouve **"service_role"** (⚠️ **NE JAMAIS** utiliser cette clé côté client !)
6. **COPIE CETTE CLÉ** (commence par `eyJ...`)

---

## 🔵 ÉTAPE 3 : Configurer les variables d'environnement

Ajoute ces variables dans ton fichier `.env.local` à la racine du projet :

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_... (ta clé secrète Stripe)
STRIPE_PRICE_ID_MENSUEL=price_... (ID du prix mensuel)
STRIPE_PRICE_ID_ANNUEL=price_... (ID du prix annuel)
STRIPE_WEBHOOK_SECRET=whsec_... (on va le récupérer à l'étape suivante)

# Supabase (déjà configuré normalement)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (clé anon, utilisée côté client)

# Supabase Service Role (pour les webhooks uniquement)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (la clé service_role récupérée à l'étape 2)

# URL de l'app (pour les redirections)
NEXT_PUBLIC_APP_URL=http://localhost:3000 (en dev)
# ou https://ton-domaine.com (en production)
```

⚠️ **Sécurité** :
- ✅ Ne commite **JAMAIS** le fichier `.env.local` (il est normalement dans `.gitignore`)
- ✅ La clé `SUPABASE_SERVICE_ROLE_KEY` est très sensible, ne la partage **JAMAIS**
- ✅ `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont aussi sensibles

---

## 🔵 ÉTAPE 4 : Configurer le webhook Stripe

Le webhook permet à Stripe de notifier ton app quand un paiement est effectué, annulé, etc.

### 4.1 Créer un endpoint webhook dans Stripe Dashboard

1. Va sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Va dans **"Developers"** > **"Webhooks"**
3. Clique sur **"+ Add endpoint"** (ou "+ Ajouter un endpoint")

#### En mode développement (local) :
- **Endpoint URL** : `http://localhost:3000/api/webhooks/stripe` (pour tester avec Stripe CLI)
- **Description** : `Foodlane Premium - Local Development`

#### En production :
- **Endpoint URL** : `https://ton-domaine.com/api/webhooks/stripe`
- **Description** : `Foodlane Premium - Production`

4. Dans **"Events to send"**, sélectionne ces événements :
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.canceled`
   - ✅ `customer.subscription.unpaid`

5. Clique sur **"Add endpoint"**

6. **COPIE LE "Signing secret"** (commence par `whsec_...`)

7. Ajoute-le dans `.env.local` comme `STRIPE_WEBHOOK_SECRET`

### 4.2 Tester le webhook en local (optionnel mais recommandé)

Si tu veux tester en local avant de déployer :

1. **Installe Stripe CLI** : [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

2. **Connecte-toi** :
   ```bash
   stripe login
   ```

3. **Lance le forwarding** :
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Cela te donnera un **webhook secret temporaire** (commence par `whsec_...`)

5. **Utilise ce secret temporaire** dans `.env.local` pour les tests locaux :
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_... (le secret temporaire de Stripe CLI)
   ```

6. **Lance ton app** dans un autre terminal :
   ```bash
   npm run dev
   ```

7. **Fais un paiement test** sur `http://localhost:3000/premium`

8. Tu devrais voir les événements dans le terminal Stripe CLI

---

## 🔵 ÉTAPE 5 : Tester l'intégration complète

### Test en local

1. **Lance ton app** : `npm run dev`

2. **Lance Stripe CLI** (dans un autre terminal) :
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. Va sur `http://localhost:3000/premium`

4. Clique sur **"Souscrire à Premium"**

5. Tu seras redirigé vers Stripe Checkout

6. **Utilise une carte de test Stripe** :
   - **Numéro** : `4242 4242 4242 4242`
   - **Date d'expiration** : N'importe quelle date future (ex: `12/25`)
   - **CVC** : N'importe quel 3 chiffres (ex: `123`)
   - **Code postal** : N'importe quel code postal (ex: `75001`)

7. **Complète le paiement**

8. Tu devrais être redirigé vers `/premium?success=true`

9. **Vérifie dans Supabase** :
   - Va dans **"Table Editor"** > **"profiles"** (ou **"profils"**)
   - Trouve ton utilisateur (via l'email)
   - Vérifie que :
     - ✅ `premium_active` = `true`
     - ✅ `premium_start_date` = date actuelle
     - ✅ `premium_end_date` = `null`
     - ✅ `stripe_customer_id` = `cus_...`
     - ✅ `stripe_subscription_id` = `sub_...`

10. **Vérifie les logs** :
    - Dans le terminal Stripe CLI, tu devrais voir `checkout.session.completed`
    - Dans les logs de ton app (`npm run dev`), tu devrais voir `✅ Premium activé pour ...`

### Test en production

1. **Déploie ton app** (Vercel, Netlify, etc.)

2. **Configure le webhook** dans Stripe Dashboard avec l'URL de production :
   - `https://ton-domaine.com/api/webhooks/stripe`

3. **Récupère le webhook secret** et ajoute-le dans les variables d'environnement de ton hébergeur

4. **Teste avec une vraie carte** (tu peux annuler immédiatement après)

---

## 🔵 ÉTAPE 6 : Vérifier que l'email est bien enregistré

Lors de la création de compte, l'email doit être enregistré dans la table `profiles`.

1. **Crée un nouveau compte** sur `/login`

2. **Vérifie dans Supabase** :
   - Va dans **"Table Editor"** > **"profiles"**
   - Trouve le nouveau compte
   - Vérifie que la colonne `email` est bien remplie

Si l'email n'est pas enregistré, le webhook ne pourra pas retrouver l'utilisateur lors du paiement.

---

## 📊 Flux complet

### Quand un utilisateur s'abonne :

1. Utilisateur clique sur **"Souscrire à Premium"** sur `/premium`
2. App appelle `/api/create-checkout-session` avec `userId` et `email`
3. Stripe Checkout s'ouvre
4. Utilisateur paie avec sa carte
5. Stripe envoie l'événement `checkout.session.completed` au webhook
6. Webhook reçoit l'événement → trouve l'utilisateur via `email` → met à jour `profiles` avec `premium_active = true`

### Quand un abonnement est annulé :

1. Utilisateur annule son abonnement dans Stripe (ou paiement échoue)
2. Stripe envoie l'événement `customer.subscription.deleted` (ou `canceled`, ou `unpaid`)
3. Webhook reçoit l'événement → trouve l'utilisateur via `stripe_customer_id` → met à jour `profiles` avec `premium_active = false`

---

## ⚠️ Points d'attention

### Mode Test vs Production

- **Test** : Utilise `sk_test_...` et `pk_test_...` - Les paiements ne sont pas réels
- **Production** : Utilise `sk_live_...` et `pk_live_...` - Les paiements sont réels

⚠️ **Ne passe en production que quand tu es prêt à recevoir de vrais paiements !**

### Sécurité

- ✅ Ne commite **JAMAIS** tes clés Stripe
- ✅ Ne commite **JAMAIS** la clé Supabase Service Role
- ✅ Utilise toujours HTTPS en production
- ✅ La vérification de signature des webhooks est déjà implémentée dans le code

### Gestion des erreurs

Le code gère déjà :
- ✅ Paiements réussis → Active premium
- ✅ Paiements annulés → Affiche un message
- ✅ Abonnements annulés → Désactive premium
- ✅ Paiements échoués → Log pour notification

### Nom de la table

⚠️ **Important** : Le code utilise `profiles` (en anglais). Si ta table s'appelle `profils` (en français), tu dois :

1. Soit renommer ta table en `profiles`
2. Soit modifier tous les fichiers qui utilisent `.from("profiles")` pour utiliser `.from("profils")`

Les fichiers concernés :
- `app/login/page.tsx`
- `app/api/webhooks/stripe/route.ts`
- `app/hooks/useSupabaseSession.ts`

---

## 🧪 Cartes de test Stripe

Pour tester différents scénarios :

- `4242 4242 4242 4242` : Paiement réussi
- `4000 0000 0000 0002` : Carte refusée
- `4000 0000 0000 9995` : Paiement insuffisant

Plus d'infos : [stripe.com/docs/testing](https://stripe.com/docs/testing)

---

## ✅ Checklist finale

- [ ] SQL de migration exécuté dans Supabase
- [ ] Colonnes `premium_active`, `premium_start_date`, etc. créées
- [ ] Clé Supabase Service Role récupérée
- [ ] Variables d'environnement configurées (`.env.local`)
- [ ] Webhook créé dans Stripe Dashboard
- [ ] Webhook Secret récupéré et ajouté dans `.env.local`
- [ ] Événements sélectionnés : `checkout.session.completed`, `customer.subscription.deleted`, etc.
- [ ] Email enregistré lors de la création de compte (testé)
- [ ] Paiement test effectué et vérifié dans Supabase
- [ ] `premium_active` passe bien à `true` après paiement
- [ ] Testé en local avec Stripe CLI (optionnel)
- [ ] Testé en production (quand prêt)

---

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Cartes de test Stripe](https://stripe.com/docs/testing)
- [Documentation Supabase](https://supabase.com/docs)

---

## 🆘 Dépannage

### Le webhook ne reçoit pas les événements

1. Vérifie que l'URL du webhook est correcte
2. Vérifie que `STRIPE_WEBHOOK_SECRET` est bien configuré
3. Vérifie les logs dans Stripe Dashboard > Developers > Webhooks > [ton endpoint] > "Recent events"
4. En local, vérifie que Stripe CLI est bien lancé

### L'email n'est pas trouvé lors du paiement

1. Vérifie que l'email est bien enregistré dans `profiles` lors de la création de compte
2. Vérifie que l'email dans Stripe correspond exactement à l'email dans Supabase (case-sensitive)
3. Vérifie les logs du webhook pour voir l'email reçu

### Premium ne s'active pas après paiement

1. Vérifie les logs du webhook dans ton app
2. Vérifie que `SUPABASE_SERVICE_ROLE_KEY` est bien configuré
3. Vérifie que la table s'appelle bien `profiles` (ou `profils` selon ton cas)
4. Vérifie les logs dans Supabase Dashboard > Logs

---

Une fois tout ça fait, les paiements Stripe devraient fonctionner et mettre à jour automatiquement le statut Premium dans Supabase ! 🎉

