# 🚀 Guide Complet : Déploiement sur Vercel via GitHub

Guide étape par étape pour déployer ton projet Foodlane sur Vercel en passant par GitHub.

---

## 📋 PRÉREQUIS

Avant de commencer, assure-toi d'avoir :
- ✅ Un compte GitHub (gratuit) : [github.com/signup](https://github.com/signup)
- ✅ Un compte Vercel (gratuit) : [vercel.com/signup](https://vercel.com/signup)
- ✅ Toutes les variables d'environnement configurées dans `.env.local` (Stripe, Supabase, etc.)

---

## 🔵 ÉTAPE 1 : Vérifier la structure du projet

### 1.1 Vérifier que le projet est prêt

Ton projet est une app Next.js standard avec :
- ✅ `package.json` avec les scripts `build` et `start`
- ✅ Structure App Router (`app/` directory)
- ✅ TypeScript configuré
- ✅ `.gitignore` présent

**✅ Tout est bon, on peut continuer !**

---

## 🔵 ÉTAPE 2 : Préparer le dépôt Git

### 2.1 Vérifier l'état Git

Ouvre un terminal dans le dossier du projet et tape :

```bash
git status
```

**Si tu vois "fatal: not a git repository"** → Git n'est pas initialisé, passe à l'étape 2.2.

**Si tu vois une liste de fichiers** → Git est déjà initialisé, passe à l'étape 2.3.

### 2.2 Initialiser Git (si nécessaire)

Si Git n'est pas initialisé, tape ces commandes :

```bash
# Initialiser Git
git init

# Créer la branche principale (main)
git branch -M main
```

### 2.3 Vérifier le fichier .gitignore

Le fichier `.gitignore` doit exclure :
- `node_modules/`
- `.next/`
- `.env.local` et autres fichiers `.env*`
- Fichiers temporaires

**✅ Ton `.gitignore` est déjà bien configuré !**

### 2.4 Ajouter tous les fichiers au dépôt

```bash
# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Vérifier ce qui va être commité
git status
```

Tu devrais voir tous tes fichiers (sauf `.env.local`, `node_modules`, etc.).

### 2.5 Faire le premier commit

```bash
git commit -m "chore: initial commit - Foodlane app"
```

---

## 🔵 ÉTAPE 3 : Créer le dépôt GitHub

### 3.1 Aller sur GitHub

1. Va sur [github.com](https://github.com) et connecte-toi
2. Clique sur le **"+"** en haut à droite → **"New repository"**

### 3.2 Configurer le nouveau dépôt

Remplis le formulaire :
- **Repository name** : `foodlane-app`
- **Description** (optionnel) : `Application de nutrition et diététique - Foodlane`
- **Visibility** : Choisis **Private** (recommandé) ou **Public**
- ⚠️ **NE COCHE PAS** "Add a README file" (on a déjà nos fichiers)
- ⚠️ **NE COCHE PAS** "Add .gitignore" (on en a déjà un)
- ⚠️ **NE COCHE PAS** "Choose a license"

3. Clique sur **"Create repository"**

### 3.3 Copier l'URL du dépôt

Une fois le dépôt créé, GitHub affiche une page avec des instructions.

**Copie l'URL HTTPS** (elle ressemble à) :
```
https://github.com/TON-USERNAME/foodlane-app.git
```

⚠️ **Remplace `TON-USERNAME` par ton vrai nom d'utilisateur GitHub !**

---

## 🔵 ÉTAPE 4 : Connecter le projet local à GitHub

### 4.1 Ajouter le remote GitHub

Dans ton terminal (toujours dans le dossier du projet), tape :

```bash
git remote add origin https://github.com/TON-USERNAME/foodlane-app.git
```

⚠️ **Remplace `TON-USERNAME` par ton vrai nom d'utilisateur GitHub !**

### 4.2 Vérifier que le remote est bien ajouté

```bash
git remote -v
```

Tu devrais voir :
```
origin  https://github.com/TON-USERNAME/foodlane-app.git (fetch)
origin  https://github.com/TON-USERNAME/foodlane-app.git (push)
```

### 4.3 Pousser le code sur GitHub

```bash
# Pousser la branche main sur GitHub
git push -u origin main
```

**Si c'est la première fois**, GitHub te demandera de t'authentifier :
- Soit avec ton **username + password** (ou token)
- Soit via **GitHub Desktop** ou **Git Credential Manager**

Une fois authentifié, le code sera poussé sur GitHub ! 🎉

### 4.4 Vérifier sur GitHub

Va sur `https://github.com/TON-USERNAME/foodlane-app` et vérifie que tous tes fichiers sont bien là.

---

## 🔵 ÉTAPE 5 : Préparer Vercel

### 5.1 Créer un compte Vercel

1. Va sur [vercel.com/signup](https://vercel.com/signup)
2. Clique sur **"Continue with GitHub"** (recommandé pour connecter facilement)
3. Autorise Vercel à accéder à tes dépôts GitHub

### 5.2 Importer le projet

1. Une fois connecté, clique sur **"Add New..."** → **"Project"**
2. Tu verras la liste de tes dépôts GitHub
3. Trouve **"foodlane-app"** et clique sur **"Import"**

### 5.3 Configurer le projet dans Vercel

Vercel détecte automatiquement que c'est un projet Next.js, donc :

- **Framework Preset** : Next.js (détecté automatiquement)
- **Root Directory** : `./` (laisse par défaut)
- **Build Command** : `npm run build` (détecté automatiquement)
- **Output Directory** : `.next` (détecté automatiquement)
- **Install Command** : `npm install` (détecté automatiquement)

**✅ Clique sur "Deploy" pour l'instant** (on configurera les variables d'environnement après).

---

## 🔵 ÉTAPE 6 : Configurer les variables d'environnement dans Vercel

### 6.1 Accéder aux paramètres du projet

1. Une fois le déploiement lancé, va dans **"Settings"** (en haut)
2. Clique sur **"Environment Variables"** dans le menu de gauche

### 6.2 Ajouter toutes les variables

**Pour chaque variable ci-dessous**, clique sur **"Add New"** et remplis :

#### Variables Stripe (côté serveur uniquement)

| Nom de la variable | Valeur | Où la trouver |
|-------------------|--------|---------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` ou `sk_live_...` | Ton `.env.local` → copie la valeur |
| `STRIPE_PRICE_ID_MENSUEL` | `price_...` | Ton `.env.local` → copie la valeur |
| `STRIPE_PRICE_ID_ANNUEL` | `price_...` | Ton `.env.local` → copie la valeur |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Ton `.env.local` → copie la valeur |

⚠️ **Important** : Pour chaque variable Stripe, sélectionne **"Production"**, **"Preview"** et **"Development"** dans les environnements.

#### Variables Supabase (côté serveur uniquement)

| Nom de la variable | Valeur | Où la trouver |
|-------------------|--------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Ton `.env.local` → copie la valeur |

⚠️ **Important** : Sélectionne **"Production"**, **"Preview"** et **"Development"** dans les environnements.

#### Variables Supabase (côté client - NEXT_PUBLIC_*)

| Nom de la variable | Valeur | Où la trouver |
|-------------------|--------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Ton `.env.local` → copie la valeur |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Ton `.env.local` → copie la valeur |

⚠️ **Important** : Sélectionne **"Production"**, **"Preview"** et **"Development"** dans les environnements.

#### Variable URL de l'app (côté client)

| Nom de la variable | Valeur | Comment la remplir |
|-------------------|--------|-------------------|
| `NEXT_PUBLIC_APP_URL` | `https://ton-projet.vercel.app` | **Après le premier déploiement**, Vercel te donnera une URL. Remplace `ton-projet` par le nom de ton projet Vercel. Exemple : `https://foodlane-app.vercel.app` |

⚠️ **Important** : Sélectionne **"Production"**, **"Preview"** et **"Development"** dans les environnements.

### 6.3 Sauvegarder les variables

Une fois toutes les variables ajoutées, clique sur **"Save"**.

---

## 🔵 ÉTAPE 7 : Configurer le webhook Stripe pour la production

### 7.1 Récupérer l'URL de production Vercel

1. Dans Vercel, va dans **"Deployments"**
2. Clique sur le dernier déploiement
3. **Copie l'URL** (elle ressemble à `https://foodlane-app.vercel.app`)

### 7.2 Configurer le webhook dans Stripe

1. Va sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Va dans **"Developers"** → **"Webhooks"**
3. Clique sur **"+ Add endpoint"**
4. Remplis :
   - **Endpoint URL** : `https://TON-PROJET-VERCEL.vercel.app/api/webhooks/stripe`
     - Remplace `TON-PROJET-VERCEL` par ton URL Vercel
     - Exemple : `https://foodlane-app.vercel.app/api/webhooks/stripe`
   - **Description** : `Foodlane Premium - Production`
5. Dans **"Events to send"**, sélectionne :
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.canceled`
   - ✅ `customer.subscription.unpaid`
6. Clique sur **"Add endpoint"**
7. **COPIE LE "Signing secret"** (commence par `whsec_...`)

### 7.3 Mettre à jour la variable dans Vercel

1. Retourne dans Vercel → **Settings** → **Environment Variables**
2. Trouve `STRIPE_WEBHOOK_SECRET`
3. Clique sur **"Edit"**
4. Remplace la valeur par le nouveau secret de production
5. Clique sur **"Save"**

### 7.4 Redéployer

1. Dans Vercel, va dans **"Deployments"**
2. Clique sur les **"..."** du dernier déploiement
3. Clique sur **"Redeploy"**
4. Confirme le redéploiement

---

## 🔵 ÉTAPE 8 : Tester le déploiement

### 8.1 Vérifier que l'app fonctionne

1. Va sur l'URL de production Vercel (ex: `https://foodlane-app.vercel.app`)
2. Vérifie que l'app se charge correctement
3. Teste la connexion
4. Teste la navigation

### 8.2 Tester le paiement Premium

1. Va sur `/premium`
2. Clique sur "Souscrire à Premium"
3. Utilise une carte de test Stripe : `4242 4242 4242 4242`
4. Complète le paiement
5. Vérifie dans Supabase que `premium_active` passe à `true`

### 8.3 Vérifier les logs

Si quelque chose ne fonctionne pas :
1. Dans Vercel → **"Deployments"** → clique sur le déploiement
2. Va dans l'onglet **"Logs"** pour voir les erreurs
3. Vérifie aussi les logs dans Stripe Dashboard → Webhooks → [ton endpoint] → "Recent events"

---

## ✅ CHECKLIST COMPLÈTE DE DÉPLOIEMENT

### 📝 Dans le terminal (projet local)

- [ ] Vérifier que Git est initialisé : `git status`
- [ ] Si non, initialiser : `git init` puis `git branch -M main`
- [ ] Vérifier le `.gitignore` (déjà fait ✅)
- [ ] Ajouter les fichiers : `git add .`
- [ ] Faire le premier commit : `git commit -m "chore: initial commit - Foodlane app"`
- [ ] Vérifier ce qui va être commité : `git status`

### 🌐 Sur GitHub

- [ ] Créer un compte GitHub (si pas déjà fait)
- [ ] Créer un nouveau dépôt : `foodlane-app`
- [ ] **NE PAS** cocher "Add README", "Add .gitignore", "Add license"
- [ ] Copier l'URL HTTPS du dépôt

### 📤 Dans le terminal (connecter à GitHub)

- [ ] Ajouter le remote : `git remote add origin https://github.com/TON-USERNAME/foodlane-app.git`
- [ ] Vérifier le remote : `git remote -v`
- [ ] Pousser le code : `git push -u origin main`
- [ ] Vérifier sur GitHub que les fichiers sont bien là

### 🚀 Sur Vercel

- [ ] Créer un compte Vercel (via GitHub)
- [ ] Importer le projet `foodlane-app`
- [ ] Laisser Vercel détecter automatiquement Next.js
- [ ] Cliquer sur "Deploy" (premier déploiement)

### 🔐 Configuration Vercel (variables d'environnement)

- [ ] Aller dans **Settings** → **Environment Variables**
- [ ] Ajouter `STRIPE_SECRET_KEY` (Production + Preview + Development)
- [ ] Ajouter `STRIPE_PRICE_ID_MENSUEL` (Production + Preview + Development)
- [ ] Ajouter `STRIPE_PRICE_ID_ANNUEL` (Production + Preview + Development)
- [ ] Ajouter `STRIPE_WEBHOOK_SECRET` (Production + Preview + Development) - temporaire, sera mis à jour après
- [ ] Ajouter `SUPABASE_SERVICE_ROLE_KEY` (Production + Preview + Development)
- [ ] Ajouter `NEXT_PUBLIC_SUPABASE_URL` (Production + Preview + Development)
- [ ] Ajouter `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview + Development)
- [ ] Ajouter `NEXT_PUBLIC_APP_URL` (Production + Preview + Development) - avec l'URL Vercel après le premier déploiement

### 🔗 Configuration Stripe (webhook production)

- [ ] Récupérer l'URL de production Vercel
- [ ] Aller dans Stripe Dashboard → Developers → Webhooks
- [ ] Créer un nouveau webhook avec l'URL : `https://TON-PROJET.vercel.app/api/webhooks/stripe`
- [ ] Sélectionner les événements : `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.canceled`, `customer.subscription.unpaid`
- [ ] Copier le nouveau "Signing secret"
- [ ] Mettre à jour `STRIPE_WEBHOOK_SECRET` dans Vercel avec le nouveau secret
- [ ] Redéployer le projet dans Vercel

### 🧪 Tests finaux

- [ ] Vérifier que l'app fonctionne sur l'URL Vercel
- [ ] Tester la connexion
- [ ] Tester la navigation
- [ ] Tester le paiement Premium avec une carte test
- [ ] Vérifier dans Supabase que `premium_active` passe à `true`
- [ ] Vérifier les logs Vercel si erreur

---

## 🆘 Dépannage

### Le déploiement échoue

1. **Vérifie les logs Vercel** : Deployments → [ton déploiement] → Logs
2. **Vérifie que toutes les variables d'environnement sont bien configurées**
3. **Vérifie que `npm run build` fonctionne en local** : `npm run build`

### Le webhook ne fonctionne pas

1. **Vérifie l'URL du webhook dans Stripe** : doit être `https://TON-PROJET.vercel.app/api/webhooks/stripe`
2. **Vérifie que `STRIPE_WEBHOOK_SECRET` est bien configuré dans Vercel**
3. **Vérifie les logs Stripe** : Developers → Webhooks → [ton endpoint] → Recent events

### Les variables d'environnement ne sont pas prises en compte

1. **Redéploie le projet** après avoir ajouté/modifié les variables
2. **Vérifie que tu as bien sélectionné les environnements** (Production, Preview, Development)
3. **Vérifie l'orthographe** des noms de variables (case-sensitive)

---

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation GitHub](https://docs.github.com)
- [Documentation Next.js](https://nextjs.org/docs)

---

## 🎉 C'est fait !

Une fois toutes ces étapes complétées, ton app sera :
- ✅ Déployée sur Vercel
- ✅ Connectée à GitHub (chaque push déclenchera un nouveau déploiement)
- ✅ Configurée avec toutes les variables d'environnement
- ✅ Prête à recevoir des paiements Stripe en production

**Bravo ! 🚀**

