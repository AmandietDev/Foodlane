# 💳 Guide Complet - Configuration Stripe pour Abonnements Récurrents Mensuels

Guide étape par étape pour configurer Stripe afin que les paiements soient débités automatiquement chaque mois.

---

## 📋 Table des matières

1. [Créer un produit récurrent dans Stripe](#1-créer-un-produit-récurrent-dans-stripe)
2. [Configurer le webhook Stripe](#2-configurer-le-webhook-stripe)
3. [Configurer les variables d'environnement](#3-configurer-les-variables-denvironnement)
4. [Tester les renouvellements](#4-tester-les-renouvellements)
5. [Vérifier que tout fonctionne](#5-vérifier-que-tout-fonctionne)

---

## 1. Créer un produit récurrent dans Stripe

### Étape 1.1 : Accéder à Stripe Dashboard

1. Allez sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Connectez-vous à votre compte
3. **Important** : Assurez-vous d'être en **mode Test** pour les tests, puis passez en **mode Live** pour la production

### Étape 1.2 : Créer un produit

1. Dans le menu de gauche, cliquez sur **"Products"** (Produits)
2. Cliquez sur **"+ Add product"** (Ajouter un produit)
3. Remplissez les informations :
   - **Name** : `Foodlane Premium - Mensuel`
   - **Description** : `Abonnement Premium mensuel à Foodlane`
   - **Pricing model** : Sélectionnez **"Recurring"** (Récurrent)
   - **Price** : `9.99` (ou le montant de votre choix)
   - **Billing period** : Sélectionnez **"Monthly"** (Mensuel)
   - **Currency** : `EUR` (ou votre devise)
4. Cliquez sur **"Save product"**

### Étape 1.3 : Récupérer le Price ID

1. Une fois le produit créé, vous verrez un **Price ID** qui commence par `price_`
2. **Copiez ce Price ID** (exemple : `price_1SaGltAJG1v4uSSVjOTs1Rnw`)
3. C'est ce que vous devez mettre dans `STRIPE_PRICE_ID_MENSUEL` dans Vercel

### Étape 1.4 : Créer un produit annuel (optionnel)

Si vous proposez aussi un abonnement annuel :

1. Créez un nouveau produit avec les mêmes étapes
2. **Billing period** : Sélectionnez **"Yearly"** (Annuel)
3. **Price** : `79.00` (ou votre prix annuel)
4. Copiez le **Price ID** pour `STRIPE_PRICE_ID_ANNUEL`

---

## 2. Configurer le webhook Stripe

### Étape 2.1 : Accéder aux webhooks

1. Dans Stripe Dashboard, allez dans **"Developers"** (Développeurs) → **"Webhooks"**
2. Cliquez sur **"+ Add endpoint"** (Ajouter un endpoint)

### Étape 2.2 : Configurer l'URL du webhook

1. **Endpoint URL** : Entrez l'URL de votre application Vercel
   ```
   https://votre-app.vercel.app/api/webhooks/stripe
   ```
   ⚠️ **Important** : Remplacez `votre-app` par votre vrai nom de projet Vercel

2. **Description** : `Webhook Foodlane - Gestion abonnements Premium`

3. **Events to send** : Sélectionnez **"Select events"** (Sélectionner des événements)

### Étape 2.3 : Sélectionner les événements

Cochez les événements suivants (dans l'ordre) :

#### Événements de paiement :
- ✅ `checkout.session.completed` - Premier paiement réussi
- ✅ `invoice.payment_succeeded` - **Renouvellement mensuel réussi** ⭐
- ✅ `invoice.payment_failed` - Échec de paiement lors du renouvellement

#### Événements d'abonnement :
- ✅ `customer.subscription.created` - Abonnement créé
- ✅ `customer.subscription.updated` - Abonnement modifié
- ✅ `customer.subscription.deleted` - Abonnement annulé

#### Événements de facture :
- ✅ `invoice.created` - Facture créée
- ✅ `invoice.finalized` - Facture finalisée

4. Cliquez sur **"Add endpoint"** (Ajouter l'endpoint)

### Étape 2.4 : Récupérer le secret du webhook

1. Une fois le webhook créé, cliquez dessus pour voir les détails
2. Dans la section **"Signing secret"**, cliquez sur **"Reveal"** (Révéler)
3. **Copiez le secret** qui commence par `whsec_`
4. C'est ce que vous devez mettre dans `STRIPE_WEBHOOK_SECRET` dans Vercel

⚠️ **Important** : 
- Vous aurez un secret différent pour le **mode Test** et le **mode Live**
- Configurez les deux dans Vercel (un pour Preview/Development, un pour Production)

---

## 3. Configurer les variables d'environnement

### Étape 3.1 : Dans Vercel

1. Allez sur [vercel.com](https://vercel.com) → votre projet
2. **Settings** → **Environment Variables**

### Étape 3.2 : Ajouter les variables Stripe

Ajoutez ces variables (une par une) :

#### Variables à partager (link) - `NEXT_PUBLIC_*` :
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - **Value** : Votre clé publique Stripe (commence par `pk_test_` ou `pk_live_`)
  - **Environments** : ✅ Production, ✅ Preview, ✅ Development

#### Variables secrètes (NE PAS partager) :
- `STRIPE_SECRET_KEY`
  - **Value** : Votre clé secrète Stripe (commence par `sk_test_` ou `sk_live_`)
  - **Environments** : ✅ Production, ✅ Preview, ✅ Development
  - ⚠️ **NE PAS COCHER "Link"** - garder privée

- `STRIPE_WEBHOOK_SECRET`
  - **Value** : Le secret du webhook (commence par `whsec_`)
  - **Environments** : ✅ Production, ✅ Preview, ✅ Development
  - ⚠️ **NE PAS COCHER "Link"** - garder privée

- `STRIPE_PRICE_ID_MENSUEL`
  - **Value** : Le Price ID du produit mensuel (commence par `price_`)
  - **Environments** : ✅ Production, ✅ Preview, ✅ Development
  - ⚠️ **NE PAS COCHER "Link"** - garder privée

- `STRIPE_PRICE_ID_ANNUEL` (si vous avez un abonnement annuel)
  - **Value** : Le Price ID du produit annuel (commence par `price_`)
  - **Environments** : ✅ Production, ✅ Preview, ✅ Development
  - ⚠️ **NE PAS COCHER "Link"** - garder privée

### Étape 3.3 : Où trouver les clés Stripe

1. **Clés API** :
   - Stripe Dashboard → **"Developers"** → **"API keys"**
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`
   - ⚠️ Utilisez les clés **Test** pour Preview/Development, **Live** pour Production

2. **Price IDs** :
   - Stripe Dashboard → **"Products"** → Cliquez sur votre produit
   - Le **Price ID** est affiché sous le prix

3. **Webhook Secret** :
   - Stripe Dashboard → **"Developers"** → **"Webhooks"** → Cliquez sur votre webhook
   - Section **"Signing secret"** → Cliquez sur **"Reveal"**

---

## 4. Tester les renouvellements

### Étape 4.1 : Tester avec Stripe CLI (recommandé)

1. **Installer Stripe CLI** :
   ```bash
   # Windows (avec Chocolatey)
   choco install stripe
   
   # Ou télécharger depuis https://stripe.com/docs/stripe-cli
   ```

2. **Se connecter à Stripe** :
   ```bash
   stripe login
   ```

3. **Écouter les webhooks localement** (pour tester en local) :
   ```bash
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
   ```
   Cela vous donnera un secret de webhook temporaire à utiliser en local.

4. **Déclencher un événement de test** :
   ```bash
   # Simuler un renouvellement mensuel
   stripe trigger invoice.payment_succeeded
   
   # Simuler un échec de paiement
   stripe trigger invoice.payment_failed
   
   # Simuler une annulation
   stripe trigger customer.subscription.deleted
   ```

### Étape 4.2 : Tester depuis Stripe Dashboard

1. Allez dans **"Customers"** (Clients)
2. Trouvez un client de test qui a un abonnement actif
3. Cliquez sur l'abonnement
4. Vous pouvez :
   - **Simuler un renouvellement** : Attendre la date de renouvellement (ou utiliser Stripe CLI)
   - **Annuler l'abonnement** : Cliquez sur "Cancel subscription" pour tester l'annulation

### Étape 4.3 : Vérifier les logs

1. **Logs Stripe** :
   - Stripe Dashboard → **"Developers"** → **"Webhooks"** → Cliquez sur votre webhook
   - Onglet **"Logs"** pour voir tous les événements reçus
   - Vérifiez que les événements sont bien reçus (statut 200)

2. **Logs Vercel** :
   - Vercel → votre projet → **Deployments** → Cliquez sur un déploiement
   - Onglet **"Functions"** → Cherchez `/api/webhooks/stripe`
   - Vérifiez les logs pour voir si les webhooks sont bien traités

3. **Logs Supabase** :
   - Supabase Dashboard → **Logs** → **API Logs**
   - Vérifiez que les mises à jour de `profiles` sont bien effectuées

---

## 5. Vérifier que tout fonctionne

### Checklist de vérification

#### 5.1 Premier paiement
- [ ] L'utilisateur peut souscrire à Premium
- [ ] Le paiement est traité par Stripe
- [ ] Le webhook `checkout.session.completed` est reçu
- [ ] Le profil est mis à jour dans Supabase (`premium_active = true`)
- [ ] Les fonctionnalités Premium sont débloquées

#### 5.2 Renouvellement mensuel
- [ ] Le webhook `invoice.payment_succeeded` est configuré
- [ ] Le webhook est bien reçu lors d'un renouvellement (test avec Stripe CLI)
- [ ] La date `premium_end_date` est mise à jour dans Supabase
- [ ] Le statut `premium_active` reste à `true`
- [ ] Les fonctionnalités Premium restent accessibles

#### 5.3 Échec de paiement
- [ ] Le webhook `invoice.payment_failed` est configuré
- [ ] En cas d'échec, l'utilisateur est notifié (si implémenté)
- [ ] Stripe réessaie automatiquement (selon votre configuration)

#### 5.4 Annulation
- [ ] L'utilisateur peut annuler son abonnement (à implémenter dans l'app)
- [ ] Le webhook `customer.subscription.deleted` est reçu
- [ ] Le profil est mis à jour (`premium_active = false`)
- [ ] Les fonctionnalités Premium sont bloquées

---

## 🔧 Configuration avancée

### Mode Test vs Mode Live

**Mode Test** :
- Utilisez les clés qui commencent par `pk_test_` et `sk_test_`
- Les webhooks de test ont un secret qui commence par `whsec_` (différent du live)
- Parfait pour tester sans risquer de vrais paiements

**Mode Live** :
- Utilisez les clés qui commencent par `pk_live_` et `sk_live_`
- Les webhooks live ont un secret différent
- ⚠️ **Attention** : Les paiements sont réels en mode Live !

### Configuration recommandée dans Vercel

- **Production** : Utilisez les clés **Live** de Stripe
- **Preview** : Utilisez les clés **Test** de Stripe
- **Development** : Utilisez les clés **Test** de Stripe

---

## 🐛 Dépannage

### Problème : Le webhook n'est pas reçu

**Solutions** :
1. Vérifiez que l'URL du webhook est correcte dans Stripe
2. Vérifiez que l'URL est accessible (pas de 404)
3. Vérifiez les logs Stripe pour voir les erreurs
4. Vérifiez que `STRIPE_WEBHOOK_SECRET` est bien configuré dans Vercel

### Problème : Le renouvellement ne met pas à jour Supabase

**Solutions** :
1. Vérifiez que l'événement `invoice.payment_succeeded` est bien sélectionné dans Stripe
2. Vérifiez les logs Vercel pour voir si le webhook est reçu
3. Vérifiez les logs Supabase pour voir si la mise à jour est effectuée
4. Vérifiez que `STRIPE_WEBHOOK_SECRET` correspond au bon secret (test vs live)

### Problème : Erreur de signature

**Solutions** :
1. Vérifiez que `STRIPE_WEBHOOK_SECRET` est le bon secret
2. Vérifiez que vous utilisez le secret du bon environnement (test vs live)
3. Supprimez et recréez le webhook si nécessaire

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Consultez les logs Stripe → Developers → Webhooks → Logs
2. Consultez les logs Vercel → Deployments → Functions
3. Consultez la documentation Stripe : https://stripe.com/docs/webhooks

---

## ✅ Résumé rapide

1. **Créer un produit récurrent** dans Stripe (mensuel)
2. **Configurer le webhook** avec l'URL : `https://votre-app.vercel.app/api/webhooks/stripe`
3. **Sélectionner les événements** : `invoice.payment_succeeded`, `checkout.session.completed`, etc.
4. **Récupérer le secret** du webhook
5. **Configurer les variables** dans Vercel
6. **Tester** avec Stripe CLI
7. **Vérifier** que les renouvellements mettent à jour Supabase

Voilà ! Votre système de paiement récurrent est maintenant configuré. 🎉

