# 💳 Guide : Intégration Stripe pour les Paiements Premium

## 🎯 Objectif

Configurer Stripe pour que les utilisateurs puissent s'abonner à Premium et que tu puisses encaisser les paiements directement sur ton compte Stripe.

---

## 📋 Ce qui est déjà fait

✅ Code implémenté :
- Route API `/api/create-checkout-session` pour créer une session Stripe Checkout
- Route webhook `/api/webhooks/stripe` pour gérer les événements Stripe
- Page premium modifiée pour rediriger vers Stripe
- Package Stripe ajouté dans `package.json`

**Il ne te reste plus qu'à configurer Stripe et créer les produits/prix.**

---

## 🔵 ÉTAPE 1 : Créer un compte Stripe

1. Va sur [Stripe.com](https://stripe.com/)
2. Clique sur **"Créer un compte"** (ou "Sign up")
3. Remplis le formulaire avec tes informations
4. Vérifie ton email
5. Complète les informations de ton entreprise (nécessaire pour recevoir les paiements)

---

## 🔵 ÉTAPE 2 : Récupérer tes clés API

1. Une fois connecté à Stripe, va dans le **Dashboard**
2. Dans le menu de gauche, va dans **"Developers"** > **"API keys"**
3. Tu verras deux clés :
   - **Publishable key** (commence par `pk_test_...` en mode test)
   - **Secret key** (commence par `sk_test_...` en mode test)

⚠️ **Important** : En mode test, les clés commencent par `pk_test_` et `sk_test_`. En production, elles commencent par `pk_live_` et `sk_live_`.

4. **COPIE ET GARDE** la **Secret key** (tu en auras besoin)

---

## 🔵 ÉTAPE 3 : Créer un produit et un prix

### 3.1 Créer le produit Premium

1. Dans le Dashboard Stripe, va dans **"Products"** (ou "Produits")
2. Clique sur **"+ Add product"** (ou "+ Ajouter un produit")
3. Remplis :
   - **Name** : `Foodlane Premium`
   - **Description** : `Abonnement Premium mensuel à Foodlane - Accès à toutes les fonctionnalités avancées`
4. Dans **"Pricing"**, choisis :
   - **Pricing model** : `Recurring` (Récurrent)
   - **Price** : `9.99` EUR
   - **Billing period** : `Monthly` (Mensuel)
5. Clique sur **"Save product"** (ou "Enregistrer")

### 3.2 Récupérer l'ID du prix

1. Une fois le produit créé, tu verras son **Price ID**
2. Il ressemble à : `price_1ABC123def456GHI789jkl`
3. **COPIE CET ID** (tu en auras besoin pour la configuration)

---

## 🔵 ÉTAPE 4 : Récupérer la clé Supabase Service Role

Pour que le webhook puisse mettre à jour les profils dans Supabase, il faut la clé Service Role (qui bypass les RLS).

1. Va sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionne ton projet
3. Va dans **"Settings"** > **"API"**
4. Trouve **"service_role"** (⚠️ **NE JAMAIS** utiliser cette clé côté client !)
5. **COPIE CETTE CLÉ** (commence par `eyJ...`)

---

## 🔵 ÉTAPE 5 : Configurer les variables d'environnement

Ajoute ces variables dans ton fichier `.env.local` :

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_... (ta clé secrète Stripe)
STRIPE_PRICE_ID=price_1ABC123def456GHI789jkl (l'ID du prix créé)
STRIPE_WEBHOOK_SECRET=whsec_... (on va le récupérer à l'étape suivante)

# Supabase Service Role (pour les webhooks)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (la clé service_role de Supabase)

# URL de l'app (pour les redirections)
NEXT_PUBLIC_APP_URL=http://localhost:3000 (en dev)
# ou https://ton-domaine.com (en production)
```

⚠️ **Important** : 
- Ne commite JAMAIS le fichier `.env.local` (il est normalement dans `.gitignore`)
- La clé `SUPABASE_SERVICE_ROLE_KEY` est très sensible, ne la partage JAMAIS

---

## 🔵 ÉTAPE 6 : Configurer le webhook Stripe

Le webhook permet à Stripe de notifier ton app quand un paiement est effectué, annulé, etc.

### 6.1 Créer un endpoint webhook dans Stripe Dashboard

1. Va dans Stripe Dashboard > **"Developers"** > **"Webhooks"**
2. Clique sur **"+ Add endpoint"** (ou "+ Ajouter un endpoint")
3. Remplis :
   - **Endpoint URL** : `https://ton-domaine.com/api/webhooks/stripe` (en production)
   - **Description** : `Foodlane Premium Subscriptions`
4. Dans **"Events to send"**, sélectionne ces événements :
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Clique sur **"Add endpoint"**
6. **COPIE LE "Signing secret"** (commence par `whsec_...`)
7. Ajoute-le dans `.env.local` comme `STRIPE_WEBHOOK_SECRET`

### 6.2 Tester le webhook en local (optionnel)

Si tu veux tester en local avant de déployer :

1. Installe Stripe CLI : [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Connecte-toi : `stripe login`
3. Lance le forwarding :
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Cela te donnera un webhook secret temporaire (commence par `whsec_...`)
5. Utilise ce secret temporaire dans `.env.local` pour les tests locaux

---

## 🔵 ÉTAPE 7 : Mettre à jour la table Supabase

Il faut ajouter des colonnes à la table `profiles` pour stocker les infos d'abonnement Stripe.

1. Va sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionne ton projet
3. Va dans **"SQL Editor"**
4. Exécute ce SQL :

```sql
-- Ajouter les colonnes pour l'abonnement Stripe
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_expiration_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Créer un index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
```

---

## 🔵 ÉTAPE 8 : Installer les dépendances

Dans ton terminal, installe le package Stripe :

```bash
npm install stripe
```

---

## 🧪 ÉTAPE 9 : Tester

### Test en local

1. Lance ton app : `npm run dev`
2. Va sur `http://localhost:3000/premium`
3. Clique sur "Souscrire à Premium"
4. Tu devrais être redirigé vers Stripe Checkout
5. Utilise une carte de test Stripe :
   - **Numéro** : `4242 4242 4242 4242`
   - **Date d'expiration** : N'importe quelle date future (ex: `12/25`)
   - **CVC** : N'importe quel 3 chiffres (ex: `123`)
   - **Code postal** : N'importe quel code postal (ex: `75001`)
6. Complète le paiement
7. Tu devrais être redirigé vers `/premium?success=true`
8. Vérifie dans Supabase que le profil a été mis à jour avec `subscription_status = 'premium'`

### Test en production

1. Déploie ton app
2. Configure les webhooks avec l'URL de production
3. Teste avec une vraie carte (tu peux annuler immédiatement après)

---

## ⚠️ Points d'attention

### Mode Test vs Production

- **Test** : Utilise `sk_test_...` et `pk_test_...` - Les paiements ne sont pas réels
- **Production** : Utilise `sk_live_...` et `pk_live_...` - Les paiements sont réels

⚠️ **Ne passe en production que quand tu es prêt à recevoir de vrais paiements !**

### Sécurité

- ✅ Ne commite JAMAIS tes clés Stripe
- ✅ Ne commite JAMAIS la clé Supabase Service Role
- ✅ Utilise toujours HTTPS en production
- ✅ Vérifie la signature des webhooks (déjà fait dans le code)

### Gestion des erreurs

Le code gère déjà :
- ✅ Paiements réussis → Active premium
- ✅ Paiements annulés → Affiche un message
- ✅ Abonnements renouvelés → Prolonge premium
- ✅ Abonnements annulés → Désactive premium
- ✅ Paiements échoués → Log pour notification

---

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Cartes de test Stripe](https://stripe.com/docs/testing)

---

## ✅ Checklist finale

- [ ] Compte Stripe créé
- [ ] Clés API récupérées (Secret Key)
- [ ] Produit Premium créé dans Stripe
- [ ] Price ID récupéré
- [ ] Clé Supabase Service Role récupérée
- [ ] Variables d'environnement configurées (`.env.local`)
- [ ] Webhook créé dans Stripe Dashboard
- [ ] Webhook Secret récupéré et ajouté dans `.env.local`
- [ ] Table Supabase mise à jour (colonnes d'abonnement)
- [ ] Package Stripe installé (`npm install stripe`)
- [ ] Testé en local avec une carte de test
- [ ] Testé en production (optionnel)

Une fois tout ça fait, les paiements Stripe devraient fonctionner ! 🎉

---

## 💡 Astuce

Pour tester différents scénarios, utilise les cartes de test Stripe :
- `4242 4242 4242 4242` : Paiement réussi
- `4000 0000 0000 0002` : Carte refusée
- `4000 0000 0000 9995` : Paiement insuffisant

Plus d'infos : [stripe.com/docs/testing](https://stripe.com/docs/testing)
