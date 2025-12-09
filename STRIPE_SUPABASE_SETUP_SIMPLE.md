# 🔗 Guide Simple : Configuration Stripe ↔ Supabase (Sans Stripe CLI)

Ce guide explique comment configurer l'intégration Stripe ↔ Supabase pour gérer les abonnements Premium, **sans utiliser Stripe CLI**.

---

## 📋 Prérequis

- ✅ Compte Stripe créé
- ✅ Compte Supabase créé
- ✅ Table `profiles` dans Supabase avec les colonnes nécessaires (voir `SUPABASE_MIGRATION_PROFILES.sql`)
- ✅ Application déployée (ou prête à être déployée) sur Vercel/Netlify/etc.

---

## 🔵 ÉTAPE 1 : Variables d'environnement

Ajoute ces variables dans ton fichier `.env.local` (pour le développement) et dans les variables d'environnement de ton hébergeur (Vercel, Netlify, etc.) pour la production :

```env
# Stripe - Clés API
STRIPE_SECRET_KEY=sk_test_... (ta clé secrète Stripe en mode test)
STRIPE_PRICE_ID_MENSUEL=price_... (ID du prix mensuel créé dans Stripe)
STRIPE_PRICE_ID_ANNUEL=price_... (ID du prix annuel créé dans Stripe)
STRIPE_WEBHOOK_SECRET=whsec_... (on va le récupérer à l'étape suivante)

# Supabase - Service Role (pour les webhooks uniquement)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (la clé service_role de Supabase)

# Supabase - Client (déjà configuré normalement)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (clé anon)

# URL de l'app
NEXT_PUBLIC_APP_URL=http://localhost:3000 (en dev)
# ou https://ton-domaine.com (en production)
```

### 📝 Rôle de chaque variable

| Variable | Rôle | Où la trouver |
|----------|------|---------------|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe pour les API | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_PRICE_ID_MENSUEL` | ID du prix mensuel (9,99€/mois) | Stripe Dashboard → Products → [Ton produit] → Price ID |
| `STRIPE_PRICE_ID_ANNUEL` | ID du prix annuel (79€/an) | Stripe Dashboard → Products → [Ton produit] → Price ID |
| `STRIPE_WEBHOOK_SECRET` | Secret pour vérifier les webhooks | Stripe Dashboard → Developers → Webhooks → [Ton endpoint] → Signing secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin Supabase (bypass RLS) | Supabase Dashboard → Settings → API → service_role key |

---

## 🔵 ÉTAPE 2 : Créer les produits et prix dans Stripe

### 2.1 Créer le produit Premium Mensuel

1. Va sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Va dans **"Products"** (ou "Produits")
3. Clique sur **"+ Add product"** (ou "+ Ajouter un produit")
4. Remplis :
   - **Name** : `Foodlane Premium - Mensuel`
   - **Description** : `Abonnement Premium mensuel à Foodlane - Accès à toutes les fonctionnalités avancées`
5. Dans **"Pricing"**, choisis :
   - **Pricing model** : `Recurring` (Récurrent)
   - **Price** : `9.99` EUR
   - **Billing period** : `Monthly` (Mensuel)
6. Clique sur **"Save product"** (ou "Enregistrer")
7. **COPIE LE "Price ID"** (commence par `price_...`) → c'est ton `STRIPE_PRICE_ID_MENSUEL`

### 2.2 Créer le produit Premium Annuel

1. Même processus, mais cette fois :
   - **Name** : `Foodlane Premium - Annuel`
   - **Price** : `79` EUR
   - **Billing period** : `Yearly` (Annuel)
2. **COPIE LE "Price ID"** → c'est ton `STRIPE_PRICE_ID_ANNUEL`

---

## 🔵 ÉTAPE 3 : Récupérer la clé Supabase Service Role

1. Va sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionne ton projet
3. Va dans **"Settings"** (⚙️ en bas à gauche)
4. Clique sur **"API"**
5. Dans la section **"Project API keys"**, trouve **"service_role"** (⚠️ **NE JAMAIS** utiliser cette clé côté client !)
6. **COPIE CETTE CLÉ** (commence par `eyJ...`) → c'est ton `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔵 ÉTAPE 4 : Configurer le webhook Stripe (SANS Stripe CLI)

### 4.1 Créer l'endpoint webhook dans Stripe Dashboard

1. Va sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Va dans **"Developers"** > **"Webhooks"**
3. Clique sur **"+ Add endpoint"** (ou "+ Ajouter un endpoint")

#### ⚠️ IMPORTANT : URL du webhook

**Pour la PRODUCTION** (une fois ton app déployée) :
- **Endpoint URL** : `https://TON-DOMAINE.com/api/webhooks/stripe`
  - Exemple : `https://foodlane.vercel.app/api/webhooks/stripe`

**Pour le TEST LOCAL** (optionnel, nécessite un tunnel) :
- Tu peux utiliser un service comme [ngrok](https://ngrok.com/) ou [localtunnel](https://localtunnel.github.io/www/) pour exposer ton `localhost:3000`
- Ou simplement tester directement en production une fois déployé

4. **Description** : `Foodlane Premium - Webhook Supabase`

5. Dans **"Events to send"**, sélectionne **EXACTEMENT** ces événements :
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.canceled`
   - ✅ `customer.subscription.unpaid`

6. Clique sur **"Add endpoint"**

7. **COPIE LE "Signing secret"** (commence par `whsec_...`) → c'est ton `STRIPE_WEBHOOK_SECRET`

8. Ajoute-le dans `.env.local` et dans les variables d'environnement de ton hébergeur

---

## 🔵 ÉTAPE 5 : Vérifier la table Supabase

Assure-toi que la table `profiles` contient bien ces colonnes :

- `email` (TEXT)
- `premium_active` (BOOLEAN, DEFAULT false)
- `premium_start_date` (TIMESTAMPTZ)
- `premium_end_date` (TIMESTAMPTZ)
- `stripe_customer_id` (TEXT)
- `stripe_subscription_id` (TEXT)

Si ce n'est pas le cas, exécute le SQL dans `SUPABASE_MIGRATION_PROFILES.sql` (voir le fichier pour les instructions).

---

## 🧪 ÉTAPE 6 : Tester l'intégration

### Test en production (recommandé)

1. **Déploie ton app** sur Vercel/Netlify/etc.

2. **Configure le webhook** dans Stripe Dashboard avec l'URL de production :
   - `https://TON-DOMAINE.com/api/webhooks/stripe`

3. **Vérifie que toutes les variables d'environnement** sont bien configurées dans ton hébergeur

4. **Va sur ton app** → `/premium`

5. **Clique sur "Souscrire à Premium"**

6. **Utilise une carte de test Stripe** :
   - **Numéro** : `4242 4242 4242 4242`
   - **Date d'expiration** : N'importe quelle date future (ex: `12/25`)
   - **CVC** : N'importe quel 3 chiffres (ex: `123`)
   - **Code postal** : N'importe quel code postal (ex: `75001`)

7. **Complète le paiement**

8. **Vérifie dans Supabase** :
   - Va dans **"Table Editor"** > **"profiles"**
   - Trouve ton utilisateur (via l'email)
   - Vérifie que :
     - ✅ `premium_active` = `true`
     - ✅ `premium_start_date` = date actuelle
     - ✅ `premium_end_date` = `null`
     - ✅ `stripe_customer_id` = `cus_...`
     - ✅ `stripe_subscription_id` = `sub_...`

9. **Vérifie les logs** :
   - Dans Stripe Dashboard → Developers → Webhooks → [ton endpoint] → "Recent events"
   - Tu devrais voir `checkout.session.completed` avec un statut `200 OK`

### Test de l'annulation

1. Dans Stripe Dashboard → **"Customers"** → trouve ton client de test
2. Clique sur l'abonnement
3. Clique sur **"Cancel subscription"**
4. Vérifie dans Supabase que `premium_active` repasse à `false` et que `premium_end_date` est rempli

---

## ⚠️ Points d'attention

### Mode Test vs Production

- **Test** : Utilise `sk_test_...` et `pk_test_...` - Les paiements ne sont pas réels
- **Production** : Utilise `sk_live_...` et `pk_live_...` - Les paiements sont réels

⚠️ **Ne passe en production que quand tu es prêt à recevoir de vrais paiements !**

### Sécurité

- ✅ Ne commite **JAMAIS** tes clés Stripe dans Git
- ✅ Ne commite **JAMAIS** la clé Supabase Service Role
- ✅ Utilise toujours HTTPS en production
- ✅ La vérification de signature des webhooks est déjà implémentée dans le code

### Gestion des erreurs

Le code gère déjà :
- ✅ Paiements réussis → Active premium
- ✅ Paiements annulés → Affiche un message
- ✅ Abonnements annulés → Désactive premium
- ✅ Paiements échoués → Log pour notification

---

## 🆘 Dépannage

### Le webhook ne reçoit pas les événements

1. Vérifie que l'URL du webhook est correcte dans Stripe Dashboard
2. Vérifie que `STRIPE_WEBHOOK_SECRET` est bien configuré
3. Vérifie les logs dans Stripe Dashboard → Developers → Webhooks → [ton endpoint] → "Recent events"
4. Vérifie que les événements sont bien sélectionnés

### L'email n'est pas trouvé lors du paiement

1. Vérifie que l'email est bien enregistré dans `profiles` lors de la création de compte
2. Vérifie que l'email dans Stripe correspond exactement à l'email dans Supabase (case-sensitive)
3. Vérifie les logs du webhook dans ton hébergeur (Vercel/Netlify logs)

### Premium ne s'active pas après paiement

1. Vérifie les logs du webhook dans ton hébergeur
2. Vérifie que `SUPABASE_SERVICE_ROLE_KEY` est bien configuré
3. Vérifie que la table s'appelle bien `profiles` (et non `profils`)
4. Vérifie les logs dans Supabase Dashboard → Logs

---

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Cartes de test Stripe](https://stripe.com/docs/testing)
- [Documentation Supabase](https://supabase.com/docs)

---

## ✅ Checklist finale

- [ ] Variables d'environnement configurées (`.env.local` + hébergeur)
- [ ] Produits créés dans Stripe (mensuel + annuel)
- [ ] Price IDs récupérés et ajoutés dans `.env.local`
- [ ] Clé Supabase Service Role récupérée
- [ ] Webhook créé dans Stripe Dashboard avec l'URL de production
- [ ] Webhook Secret récupéré et ajouté dans les variables d'environnement
- [ ] Événements sélectionnés : `checkout.session.completed`, `customer.subscription.deleted`, etc.
- [ ] Table Supabase vérifiée (colonnes premium présentes)
- [ ] Paiement test effectué et vérifié dans Supabase
- [ ] `premium_active` passe bien à `true` après paiement
- [ ] Test d'annulation effectué et vérifié

Une fois tout ça fait, les paiements Stripe devraient fonctionner et mettre à jour automatiquement le statut Premium dans Supabase ! 🎉

