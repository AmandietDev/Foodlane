# ⚡ Configuration Rapide Stripe (5 minutes)

## 🎯 Problème actuel

L'erreur indique que `STRIPE_PRICE_ID_MENSUEL` est manquant. Voici comment le configurer rapidement.

---

## 📝 ÉTAPE 1 : Créer le fichier `.env.local`

1. **Ouvre ton éditeur de code** (VS Code, etc.)
2. **À la racine du projet** (dossier `foodlane-app`), crée un fichier nommé `.env.local`
3. **Copie-colle ce contenu** dans le fichier :

```env
# Stripe - Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_MENSUEL=price_...
STRIPE_PRICE_ID_ANNUEL=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase - Service Role (pour les webhooks)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Supabase - Client (déjà configuré normalement)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# URL de l'app
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔵 ÉTAPE 2 : Récupérer les valeurs depuis Stripe

### 2.1 Récupérer `STRIPE_SECRET_KEY`

1. Va sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Clique sur **"Developers"** (en haut à droite)
3. Clique sur **"API keys"**
4. Tu verras deux clés :
   - **Publishable key** (commence par `pk_test_...`) - on n'en a pas besoin pour l'instant
   - **Secret key** (commence par `sk_test_...`) - **COPIE CETTE CLÉ**
5. Remplace `sk_test_...` dans ton `.env.local` par cette clé

### 2.2 Créer le produit et récupérer `STRIPE_PRICE_ID_MENSUEL`

1. Dans Stripe Dashboard, va dans **"Products"** (ou "Produits")
2. Clique sur **"+ Add product"**
3. Remplis :
   - **Name** : `Foodlane Premium - Mensuel`
   - **Description** : `Abonnement Premium mensuel`
4. Dans **"Pricing"** :
   - **Pricing model** : `Recurring` (Récurrent)
   - **Price** : `9.99` EUR
   - **Billing period** : `Monthly` (Mensuel)
5. Clique sur **"Save product"**
6. **Une fois le produit créé**, tu verras un **"Price ID"** (commence par `price_...`)
7. **COPIE CET ID** et remplace `price_...` dans ton `.env.local` pour `STRIPE_PRICE_ID_MENSUEL`

### 2.3 Créer le produit annuel et récupérer `STRIPE_PRICE_ID_ANNUEL`

1. Même processus, mais cette fois :
   - **Name** : `Foodlane Premium - Annuel`
   - **Price** : `79` EUR
   - **Billing period** : `Yearly` (Annuel)
2. **COPIE LE "Price ID"** et remplace `price_...` dans ton `.env.local` pour `STRIPE_PRICE_ID_ANNUEL`

---

## 🔵 ÉTAPE 3 : Récupérer `SUPABASE_SERVICE_ROLE_KEY`

1. Va sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionne ton projet
3. Va dans **"Settings"** (⚙️ en bas à gauche)
4. Clique sur **"API"**
5. Dans **"Project API keys"**, trouve **"service_role"**
6. **COPIE CETTE CLÉ** (commence par `eyJ...`)
7. Remplace `eyJ...` dans ton `.env.local` pour `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important** : Cette clé est très sensible, ne la partage JAMAIS !

---

## 🔵 ÉTAPE 4 : Vérifier les autres variables

Assure-toi que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont bien remplis (ils devraient déjà être configurés).

---

## 🔵 ÉTAPE 5 : Redémarrer le serveur

**IMPORTANT** : Après avoir créé/modifié `.env.local`, tu DOIS redémarrer ton serveur de développement :

1. **Arrête le serveur** (Ctrl+C dans le terminal)
2. **Relance-le** : `npm run dev`

Les variables d'environnement ne sont chargées qu'au démarrage du serveur !

---

## ✅ Vérification

Une fois tout configuré :

1. Redémarre le serveur (`npm run dev`)
2. Va sur `/premium`
3. Clique sur "Souscrire à Premium"
4. Tu devrais être redirigé vers Stripe Checkout ! 🎉

---

## 🆘 Si ça ne marche toujours pas

1. **Vérifie que le fichier s'appelle bien `.env.local`** (avec le point au début)
2. **Vérifie qu'il est à la racine du projet** (même niveau que `package.json`)
3. **Vérifie qu'il n'y a pas d'espaces** autour du `=` dans les variables
4. **Vérifie la console du navigateur** (F12) pour voir les erreurs exactes
5. **Vérifie les logs du serveur** dans le terminal où tourne `npm run dev`

---

## 📚 Pour plus de détails

Consulte `STRIPE_SUPABASE_SETUP_SIMPLE.md` pour un guide complet avec toutes les étapes détaillées.

