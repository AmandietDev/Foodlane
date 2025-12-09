# ✅ Checklist Complète de Déploiement - Foodlane App

Suis cette checklist point par point pour déployer ton app sur Vercel via GitHub.

---

## 📋 AVANT DE COMMENCER

- [ ] Tu as un compte GitHub (gratuit)
- [ ] Tu as un compte Vercel (gratuit)
- [ ] Ton fichier `.env.local` est bien rempli avec toutes les variables
- [ ] Tu es dans le dossier du projet : `foodlane-app`

---

## 🔵 PHASE 1 : Préparation Git (Terminal)

### Vérification

- [ ] Ouvrir un terminal dans le dossier `foodlane-app`
- [ ] Taper : `git status`
  - ✅ Si tu vois des fichiers → Git est initialisé, passe à "Ajouter les fichiers"
  - ❌ Si tu vois "fatal: not a git repository" → Continue avec "Initialiser Git"

### Initialiser Git (si nécessaire)

- [ ] `git init`
- [ ] `git branch -M main`

### Ajouter les fichiers

- [ ] `git add .`
- [ ] `git status` → Vérifier que `.env.local` n'apparaît PAS (c'est normal, il est ignoré)
- [ ] `git commit -m "chore: initial commit - Foodlane app"`

---

## 🔵 PHASE 2 : Créer le dépôt GitHub

### Sur GitHub.com

- [ ] Aller sur [github.com](https://github.com) et se connecter
- [ ] Cliquer sur **"+"** (en haut à droite) → **"New repository"**
- [ ] Remplir :
  - **Repository name** : `foodlane-app`
  - **Description** (optionnel) : `Application de nutrition et diététique`
  - **Visibility** : Private (recommandé) ou Public
  - ⚠️ **NE PAS COCHER** "Add a README file"
  - ⚠️ **NE PAS COCHER** "Add .gitignore"
  - ⚠️ **NE PAS COCHER** "Choose a license"
- [ ] Cliquer sur **"Create repository"**
- [ ] **COPIER L'URL HTTPS** du dépôt (exemple : `https://github.com/TON-USERNAME/foodlane-app.git`)

---

## 🔵 PHASE 3 : Connecter le projet à GitHub (Terminal)

**⚠️ Remplace `TON-USERNAME` par ton vrai nom d'utilisateur GitHub !**

- [ ] `git remote add origin https://github.com/TON-USERNAME/foodlane-app.git`
- [ ] `git remote -v` → Vérifier que l'URL est correcte
- [ ] `git push -u origin main`
  - Si GitHub demande l'authentification :
    - Utiliser un **Personal Access Token** (pas le mot de passe)
    - Ou utiliser **GitHub Desktop**
- [ ] Aller sur GitHub et vérifier que tous les fichiers sont bien là

---

## 🔵 PHASE 4 : Déployer sur Vercel

### Créer le projet Vercel

- [ ] Aller sur [vercel.com](https://vercel.com) et se connecter (via GitHub)
- [ ] Cliquer sur **"Add New..."** → **"Project"**
- [ ] Trouver **"foodlane-app"** dans la liste des dépôts
- [ ] Cliquer sur **"Import"**
- [ ] Vérifier la configuration (Vercel détecte automatiquement Next.js) :
  - Framework Preset : Next.js ✅
  - Root Directory : `./` ✅
  - Build Command : `npm run build` ✅
  - Output Directory : `.next` ✅
- [ ] Cliquer sur **"Deploy"** (on configurera les variables après)

### Attendre le premier déploiement

- [ ] Attendre que le déploiement se termine (2-3 minutes)
- [ ] **COPIER L'URL de production** (exemple : `https://foodlane-app.vercel.app`)

---

## 🔵 PHASE 5 : Configurer les variables d'environnement dans Vercel

### Accéder aux paramètres

- [ ] Dans Vercel, aller dans **"Settings"** (en haut)
- [ ] Cliquer sur **"Environment Variables"** (menu de gauche)

### Ajouter chaque variable (une par une)

Pour chaque variable, cliquer sur **"Add New"**, remplir, et **COCHER** : Production, Preview, Development

#### Variables Stripe

- [ ] `STRIPE_SECRET_KEY` = (copier depuis `.env.local`)
- [ ] `STRIPE_PRICE_ID_MENSUEL` = (copier depuis `.env.local`)
- [ ] `STRIPE_PRICE_ID_ANNUEL` = (copier depuis `.env.local`)
- [ ] `STRIPE_WEBHOOK_SECRET` = (copier depuis `.env.local` - sera mis à jour après)

#### Variables Supabase

- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (copier depuis `.env.local`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = (copier depuis `.env.local`)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (copier depuis `.env.local`)

#### Variable URL

- [ ] `NEXT_PUBLIC_APP_URL` = `https://TON-PROJET-VERCEL.vercel.app` (remplacer par ton URL Vercel)

### Sauvegarder

- [ ] Cliquer sur **"Save"** après chaque variable (ou toutes à la fois)

---

## 🔵 PHASE 6 : Configurer le webhook Stripe pour la production

### Dans Stripe Dashboard

- [ ] Aller sur [Stripe Dashboard](https://dashboard.stripe.com/)
- [ ] Aller dans **"Developers"** → **"Webhooks"**
- [ ] Cliquer sur **"+ Add endpoint"**
- [ ] Remplir :
  - **Endpoint URL** : `https://TON-PROJET-VERCEL.vercel.app/api/webhooks/stripe`
    - Remplace `TON-PROJET-VERCEL` par ton URL Vercel
  - **Description** : `Foodlane Premium - Production`
- [ ] Dans **"Events to send"**, sélectionner :
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.deleted`
  - ✅ `customer.subscription.canceled`
  - ✅ `customer.subscription.unpaid`
- [ ] Cliquer sur **"Add endpoint"**
- [ ] **COPIER LE "Signing secret"** (commence par `whsec_...`)

### Mettre à jour dans Vercel

- [ ] Retourner dans Vercel → **Settings** → **Environment Variables**
- [ ] Trouver `STRIPE_WEBHOOK_SECRET`
- [ ] Cliquer sur **"Edit"** (icône crayon)
- [ ] Remplacer la valeur par le nouveau secret de production
- [ ] Cliquer sur **"Save"**

### Redéployer

- [ ] Dans Vercel → **"Deployments"**
- [ ] Cliquer sur les **"..."** du dernier déploiement
- [ ] Cliquer sur **"Redeploy"**
- [ ] Confirmer le redéploiement
- [ ] Attendre que le redéploiement se termine

---

## 🔵 PHASE 7 : Tests finaux

### Vérifier l'app

- [ ] Aller sur l'URL Vercel (ex: `https://foodlane-app.vercel.app`)
- [ ] Vérifier que l'app se charge
- [ ] Tester la connexion
- [ ] Tester la navigation

### Tester le paiement Premium

- [ ] Aller sur `/premium`
- [ ] Cliquer sur "Souscrire à Premium"
- [ ] Utiliser une carte de test Stripe : `4242 4242 4242 4242`
- [ ] Compléter le paiement
- [ ] Vérifier dans Supabase que `premium_active` passe à `true`

### Vérifier les logs (si erreur)

- [ ] Dans Vercel → **"Deployments"** → [ton déploiement] → **"Logs"**
- [ ] Dans Stripe → **"Developers"** → **"Webhooks"** → [ton endpoint] → **"Recent events"**

---

## 🎉 C'EST FAIT !

Ton app est maintenant :
- ✅ Déployée sur Vercel
- ✅ Connectée à GitHub
- ✅ Configurée avec toutes les variables
- ✅ Prête à recevoir des paiements en production

---

## 📚 Fichiers de référence

- **Guide détaillé** : `GUIDE_DEPLOIEMENT_VERCEL.md`
- **Commandes exactes** : `COMMANDES_DEPLOIEMENT.md`
- **Configuration Stripe** : `STRIPE_SUPABASE_SETUP_SIMPLE.md`

---

## 🆘 Besoin d'aide ?

Si tu rencontres un problème :
1. Vérifie les logs Vercel
2. Vérifie les logs Stripe (webhooks)
3. Vérifie que toutes les variables d'environnement sont bien configurées
4. Vérifie que le webhook Stripe pointe vers la bonne URL

