# Guide de déploiement de Foodlane sur Vercel

Ce guide vous accompagne étape par étape pour déployer votre application Foodlane sur Vercel.

## 📋 Prérequis

- Un compte GitHub (gratuit)
- Un compte Vercel (gratuit, connexion avec GitHub)
- Les variables d'environnement nécessaires (voir ci-dessous)

---

## 🛠️ Configuration du projet

### Variables d'environnement requises

Votre application nécessite les variables d'environnement suivantes :

#### OBLIGATOIRE
- **`SHEET_RECIPES_CSV_URL`** : URL d'export CSV de votre Google Sheet contenant les recettes
  - Format : `https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=0`
  - Vous pouvez obtenir cette URL en partageant votre Google Sheet en lecture publique et en utilisant l'URL d'export CSV

#### OPTIONNEL
- **`OPENAI_API_KEY`** : Clé API OpenAI pour l'analyse de photos de repas
  - Si non définie, l'application fonctionnera en mode démo avec des données simulées
  - Obtenir une clé : https://platform.openai.com/api-keys

---

## 📦 Étape 1 : Préparation du projet local

### Vérification du build

Avant de déployer, testez que le build fonctionne localement :

```bash
npm run build
```

Si le build réussit, vous verrez un message de succès et un dossier `.next` sera créé.

**Note** : Si vous obtenez une erreur concernant `SHEET_RECIPES_CSV_URL`, c'est normal en local. Cette variable sera configurée sur Vercel.

---

## 🔐 Étape 2 : Configuration Git et GitHub

### 2.1. Vérifier si Git est initialisé

Ouvrez un terminal PowerShell dans le dossier de votre projet et exécutez :

```powershell
git status
```

**Si Git n'est pas initialisé** (erreur "not a git repository"), passez à l'étape 2.2.

**Si Git est déjà initialisé**, passez directement à l'étape 2.3.

### 2.2. Initialiser Git (si nécessaire)

```powershell
# Initialiser le dépôt Git
git init

# Ajouter tous les fichiers (sauf ceux ignorés par .gitignore)
git add .

# Faire le premier commit
git commit -m "Initial commit - Foodlane app ready for deployment"
```

### 2.3. Créer un dépôt sur GitHub

1. Allez sur [GitHub.com](https://github.com)
2. Cliquez sur le bouton **"+"** en haut à droite, puis **"New repository"**
3. Configurez le dépôt :
   - **Repository name** : `foodlane-app` (ou le nom de votre choix)
   - **Description** : "Application Foodlane - Génération de recettes, menus et listes de courses"
   - **Visibilité** : Choisissez **Public** (gratuit) ou **Private** (payant mais plus sécurisé)
   - ⚠️ **NE COCHEZ PAS** "Add a README file" (vous avez déjà un README.md)
   - ⚠️ **NE COCHEZ PAS** "Add .gitignore" (vous avez déjà un .gitignore)
4. Cliquez sur **"Create repository"**

### 2.4. Lier votre projet local à GitHub

GitHub vous affichera des commandes. Utilisez celles qui commencent par "...or push an existing repository from the command line".

Dans votre terminal PowerShell, exécutez (remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub) :

```powershell
# Ajouter le dépôt distant (remplacez VOTRE_USERNAME par votre nom d'utilisateur GitHub)
git remote add origin https://github.com/VOTRE_USERNAME/foodlane-app.git

# Renommer la branche principale en 'main' (si ce n'est pas déjà fait)
git branch -M main

# Pousser votre code sur GitHub
git push -u origin main
```

Si GitHub vous demande de vous authentifier :
- Utilisez un **Personal Access Token** (PAT) au lieu de votre mot de passe
- Pour créer un PAT : GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
- Donnez-lui les permissions `repo`

---

## 🚀 Étape 3 : Déploiement sur Vercel

### 3.1. Créer un compte Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Choisissez **"Continue with GitHub"** pour vous connecter avec votre compte GitHub
4. Autorisez Vercel à accéder à votre compte GitHub

### 3.2. Importer votre projet

1. Une fois connecté, cliquez sur **"Add New..."** puis **"Project"**
2. Vous verrez la liste de vos dépôts GitHub
3. Trouvez **`foodlane-app`** (ou le nom que vous avez donné) et cliquez sur **"Import"**

### 3.3. Configurer le projet

Vercel détectera automatiquement que c'est un projet **Next.js**. Voici ce que vous devez vérifier :

#### Configuration du framework
- **Framework Preset** : `Next.js` (devrait être détecté automatiquement)
- **Root Directory** : `./` (la racine du projet)
- **Build Command** : `npm run build` (vérifiez que c'est bien cela)
- **Output Directory** : `.next` (par défaut pour Next.js)
- **Install Command** : `npm install` (par défaut)

⚠️ **Important** : Si Vercel détecte automatiquement Next.js, ces valeurs seront déjà pré-remplies correctement. Ne les modifiez pas sauf si vous savez ce que vous faites.

### 3.4. Ajouter les variables d'environnement

C'est **CRUCIAL** pour que votre application fonctionne !

1. Dans la section **"Environment Variables"**, cliquez sur **"Add"** pour chaque variable :

   #### Variable 1 : SHEET_RECIPES_CSV_URL
   - **Name** : `SHEET_RECIPES_CSV_URL`
   - **Value** : Collez votre URL d'export CSV du Google Sheet
     - Exemple : `https://docs.google.com/spreadsheets/d/1egJ5SxzoiSLWnLsqgs7g5guQ97R24VZIZ5uLvwTjqFk/export?format=csv&gid=0`
   - **Environments** : Cochez **Production**, **Preview**, et **Development**

   #### Variable 2 : OPENAI_API_KEY (optionnel)
   - **Name** : `OPENAI_API_KEY`
   - **Value** : Collez votre clé API OpenAI (commence par `sk-`)
   - **Environments** : Cochez **Production**, **Preview**, et **Development**

2. Cliquez sur **"Add"** après chaque variable

### 3.5. Déployer

1. Cliquez sur le bouton **"Deploy"** en bas de la page
2. Vercel va :
   - Installer les dépendances (`npm install`)
   - Construire votre application (`npm run build`)
   - Déployer votre application
3. Cette étape prend généralement **2-5 minutes**

### 3.6. Vérifier le déploiement

Une fois le déploiement terminé :

1. Si tout s'est bien passé, vous verrez un message de succès avec une URL du type :
   ```
   https://foodlane-app-xxxxx.vercel.app
   ```
2. Cliquez sur cette URL pour ouvrir votre application dans le navigateur
3. Vérifiez que :
   - La page se charge correctement
   - Les recettes s'affichent (si vous avez configuré `SHEET_RECIPES_CSV_URL`)
   - L'application fonctionne comme en local

### 3.7. Configurer un nom de domaine personnalisé (optionnel)

Si vous voulez un nom de domaine personnalisé (par exemple `foodlane.mon-site.com`) :

1. Dans votre projet Vercel, allez dans l'onglet **"Settings"**
2. Cliquez sur **"Domains"**
3. Ajoutez votre domaine
4. Suivez les instructions pour configurer les DNS

---

## 🔄 Déploiements automatiques

Une fois configuré, **chaque push sur GitHub déclenchera automatiquement un nouveau déploiement** :

- **Branche `main`** → Déploiement en **Production**
- **Autres branches** → Déploiement en **Preview** (avec une URL unique)

### Workflow recommandé

1. Faites vos modifications en local
2. Testez avec `npm run dev`
3. Commitez vos changements :
   ```powershell
   git add .
   git commit -m "Description de vos modifications"
   git push
   ```
4. Vercel déploiera automatiquement la nouvelle version
5. Vous recevrez une notification par email une fois le déploiement terminé

---

## 🐛 Dépannage

### Erreur : "SHEET_RECIPES_CSV_URL is not defined"

**Solution** : Vérifiez que vous avez bien ajouté la variable d'environnement dans Vercel (Étape 3.4)

### Erreur : "Build failed"

**Solutions** :
1. Vérifiez les logs de build dans Vercel pour voir l'erreur exacte
2. Testez le build localement avec `npm run build`
3. Vérifiez que toutes les dépendances sont bien dans `package.json`

### Les images ne se chargent pas

**Solution** : Vérifiez que votre `next.config.ts` autorise bien les domaines d'images (déjà configuré pour Google Drive)

### L'application fonctionne en local mais pas sur Vercel

**Solutions** :
1. Vérifiez que toutes les variables d'environnement sont bien configurées
2. Vérifiez les logs de l'application dans Vercel (onglet "Functions" ou "Logs")
3. Vérifiez que votre Google Sheet est bien partagé en lecture publique

---

## 📱 Tester sur mobile

Une fois déployé, vous pouvez :

1. Ouvrir l'URL Vercel sur votre téléphone
2. Tester toutes les fonctionnalités
3. Partager le lien avec d'autres personnes pour recueillir des retours

---

## ✅ Checklist de déploiement

Avant de partager votre application, vérifiez :

- [ ] Le build fonctionne en local (`npm run build`)
- [ ] Le dépôt Git est créé et poussé sur GitHub
- [ ] Le projet est importé sur Vercel
- [ ] Toutes les variables d'environnement sont configurées
- [ ] Le premier déploiement est réussi
- [ ] L'application fonctionne correctement sur l'URL Vercel
- [ ] Les recettes se chargent correctement
- [ ] L'application fonctionne sur mobile

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Consultez les logs dans Vercel (Dashboard → Votre projet → Deployments → Cliquez sur un déploiement → Logs)
2. Vérifiez la documentation Next.js : https://nextjs.org/docs
3. Vérifiez la documentation Vercel : https://vercel.com/docs

---

**Bon déploiement ! 🚀**


