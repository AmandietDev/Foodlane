# 📋 Commandes à exécuter pour déployer Foodlane

## ✅ Étape 1 : Test du build local

Testez que votre application peut être construite :

```powershell
npm run build
```

**Résultat attendu** : Le build devrait réussir (même si vous obtenez un avertissement concernant `SHEET_RECIPES_CSV_URL`, c'est normal - cette variable sera configurée sur Vercel).

---

## ✅ Étape 2 : Configuration Git et GitHub

### 2.1. Vérifier l'état Git

```powershell
git status
```

### 2.2. Si Git n'est pas initialisé, exécutez :

```powershell
# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Faire le premier commit
git commit -m "Initial commit - Foodlane app ready for deployment"
```

### 2.3. Créer le dépôt sur GitHub

1. Allez sur [GitHub.com](https://github.com) et connectez-vous
2. Cliquez sur **"+"** → **"New repository"**
3. Nommez-le : `foodlane-app` (ou un autre nom de votre choix)
4. **Ne cochez PAS** "Add a README file" ni "Add .gitignore"
5. Cliquez sur **"Create repository"**

### 2.4. Lier votre projet local à GitHub

Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub dans ces commandes :

```powershell
# Ajouter le dépôt distant
git remote add origin https://github.com/VOTRE_USERNAME/foodlane-app.git

# Renommer la branche en 'main' (si nécessaire)
git branch -M main

# Pousser votre code sur GitHub
git push -u origin main
```

**⚠️ Important** : Si GitHub vous demande de vous authentifier, utilisez un **Personal Access Token** (PAT) au lieu de votre mot de passe. Pour créer un PAT :
- GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
- Donnez-lui la permission `repo`

---

## ✅ Étape 3 : Déploiement sur Vercel

### 3.1. Importer le projet sur Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous avec GitHub
2. Cliquez sur **"Add New..."** → **"Project"**
3. Importez votre dépôt `foodlane-app`

### 3.2. Configurer les variables d'environnement

Dans la section **"Environment Variables"**, ajoutez :

#### Variable 1 (OBLIGATOIRE)
- **Name** : `SHEET_RECIPES_CSV_URL`
- **Value** : Votre URL d'export CSV du Google Sheet
- **Environments** : ✅ Production, ✅ Preview, ✅ Development

#### Variable 2 (OPTIONNEL)
- **Name** : `OPENAI_API_KEY`
- **Value** : Votre clé API OpenAI (commence par `sk-`)
- **Environments** : ✅ Production, ✅ Preview, ✅ Development

### 3.3. Déployer

Cliquez sur **"Deploy"** et attendez 2-5 minutes.

---

## ✅ Étape 4 : Déploiements futurs

Pour chaque modification future, exécutez simplement :

```powershell
# Ajouter vos modifications
git add .

# Commiter
git commit -m "Description de vos modifications"

# Pousser sur GitHub (déclenchera automatiquement un nouveau déploiement sur Vercel)
git push
```

**🎉 C'est tout !** Vercel déploiera automatiquement chaque push sur GitHub.

---

## 📝 Résumé des fichiers modifiés

Les fichiers suivants ont été préparés pour le déploiement :

- ✅ `.gitignore` : Modifié pour permettre `.env.example`
- ✅ `DEPLOYMENT.md` : Guide complet et détaillé
- ✅ `COMMANDES_DEPLOIEMENT.md` : Ce fichier - résumé des commandes
- ✅ Configuration Next.js : Déjà optimisée pour Vercel

---

## 🔍 Vérifications finales

Avant de partager votre application, vérifiez :

- [ ] `npm run build` fonctionne
- [ ] Le code est poussé sur GitHub
- [ ] Le projet est déployé sur Vercel
- [ ] Les variables d'environnement sont configurées
- [ ] L'application fonctionne sur l'URL Vercel
- [ ] Les recettes se chargent correctement

---

**Bon déploiement ! 🚀**


