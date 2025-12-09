# 📊 Guide complet : Migrer vos recettes de Google Sheets vers Supabase

Ce guide vous accompagne **étape par étape** pour transférer toutes vos recettes depuis votre Google Sheet vers Supabase.

---

## 🎯 Vue d'ensemble

**Situation actuelle** : Vos recettes sont dans un Google Sheet  
**Objectif** : Transférer toutes ces recettes dans Supabase  
**Résultat** : Votre application utilisera Supabase au lieu de Google Sheets

**Temps estimé** : 20-30 minutes

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Un compte Google avec accès au Google Sheet contenant vos recettes
- ✅ L'URL d'export CSV de votre Google Sheet (format : `https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0`)
- ✅ Un compte GitHub (pour créer un compte Supabase)
- ✅ Node.js installé sur votre ordinateur

---

## 🚀 PARTIE 1 : Préparer Supabase

### Étape 1.1 : Créer un compte Supabase

1. **Allez sur [supabase.com](https://supabase.com)**
2. Cliquez sur **"Start your project"** (en haut à droite)
3. Choisissez **"Continue with GitHub"** (recommandé) ou créez un compte avec email
4. Autorisez Supabase à accéder à votre compte GitHub si demandé

### Étape 1.2 : Créer un nouveau projet

1. Une fois connecté, vous verrez votre dashboard
2. Cliquez sur le bouton **"New Project"** (en haut à droite, vert)
3. Remplissez le formulaire :

   **📝 Informations du projet :**
   - **Name** : `foodlane-app` (ou un nom de votre choix)
   - **Database Password** : 
     - ⚠️ **CRÉEZ UN MOT DE PASSE FORT** (minimum 12 caractères, avec majuscules, minuscules, chiffres)
     - ⚠️ **SAVEZ-LE BIEN** dans un endroit sûr (vous en aurez besoin plus tard)
     - Exemple : `Foodlane2024!Secure`
   
   **🌍 Région :**
   - Choisissez la région la plus proche de vous
   - Pour la France : **"West Europe (Paris)"**
   - Pour le Canada : **"Canada Central (Toronto)"**
   - Pour les USA : **"US East (North Virginia)"** ou **"US West (Oregon)"**
   
   **💰 Pricing Plan :**
   - Sélectionnez **"Free"** (plan gratuit, suffisant pour commencer)
   - Ce plan inclut :
     - 500 MB de base de données
     - 2 GB de bande passante
     - Jusqu'à 50 000 lignes (plus que suffisant pour vos recettes)

4. Cliquez sur **"Create new project"**
5. ⏳ **Attendez 2-3 minutes** que Supabase crée votre projet
   - Vous verrez une barre de progression
   - Ne fermez pas la page pendant ce temps

### Étape 1.3 : Récupérer vos clés API

Une fois le projet créé :

1. Dans le menu de gauche, cliquez sur **"Settings"** (⚙️ icône d'engrenage)
2. Dans le sous-menu qui s'affiche, cliquez sur **"API"**
3. Vous verrez plusieurs sections. **Notez ces informations importantes** :

   **🔗 Project URL :**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   - Copiez cette URL complète
   - Elle ressemble à : `https://abcdefghijklmnop.supabase.co`
   
   **🔑 anon public key :**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   - C'est une longue chaîne de caractères qui commence par `eyJ...`
   - Cliquez sur l'icône de copie à côté pour la copier facilement
   - ⚠️ C'est la clé **"anon public"** (pas la "service_role")

4. **📝 Sauvegardez ces deux valeurs** dans un fichier texte temporaire ou dans un gestionnaire de mots de passe :
   - Project URL
   - anon public key

---

## 🗃️ PARTIE 2 : Créer la table dans Supabase

### Étape 2.1 : Ouvrir l'éditeur SQL

1. Dans le menu de gauche de Supabase, cliquez sur **"SQL Editor"** (icône de base de données avec `</>`)
2. Vous verrez une liste de requêtes (vide au début)
3. Cliquez sur le bouton **"New query"** (en haut à droite)

### Étape 2.2 : Exécuter le script SQL

1. **Ouvrez le fichier `supabase-schema.sql`** dans votre projet Foodlane
   - Il se trouve à la racine de votre projet
   - Ouvrez-le avec un éditeur de texte (Notepad, VS Code, etc.)

2. **Sélectionnez tout le contenu** du fichier (`Ctrl+A` puis `Ctrl+C`)

3. **Retournez dans Supabase** (dans l'éditeur SQL)

4. **Collez le contenu** dans l'éditeur SQL (`Ctrl+V`)

5. **Vérifiez que le script est bien collé** (il devrait contenir des commandes `CREATE TABLE`, `CREATE INDEX`, etc.)

6. **Cliquez sur le bouton "Run"** (en bas à droite, ou appuyez sur `Ctrl+Enter`)

7. **Attendez quelques secondes**

8. **Vérifiez le résultat** :
   - ✅ Si vous voyez un message vert "Success" → C'est bon !
   - ❌ Si vous voyez une erreur rouge → Lisez le message d'erreur et vérifiez que vous avez bien collé tout le script

### Étape 2.3 : Vérifier que la table est créée

1. Dans le menu de gauche, cliquez sur **"Table Editor"** (icône de tableau)
2. Vous devriez voir une table nommée **"recipes"**
3. Cliquez sur **"recipes"** pour voir sa structure
4. Vous devriez voir toutes les colonnes :
   - `id`, `type`, `difficulte`, `temps_preparation_min`, etc.
5. La table est vide pour l'instant (c'est normal, on va la remplir ensuite)

---

## 💻 PARTIE 3 : Préparer votre ordinateur

### Étape 3.1 : Vérifier que vous avez Node.js

1. Ouvrez un terminal PowerShell (ou CMD)
2. Tapez :
   ```powershell
   node --version
   ```
3. Si vous voyez un numéro de version (ex: `v20.10.0`) → ✅ C'est bon
4. Si vous voyez une erreur → Installez Node.js depuis [nodejs.org](https://nodejs.org)

### Étape 3.2 : Installer les dépendances

1. **Ouvrez un terminal** dans le dossier de votre projet Foodlane
   - Dans VS Code : Terminal → New Terminal
   - Ou ouvrez PowerShell et naviguez vers le dossier :
     ```powershell
     cd "C:\Users\amand\OneDrive - Université de Tours\Documents\foodlane-app"
     ```

2. **Installez les dépendances** :
   ```powershell
   npm install
   ```
   
3. **Attendez que l'installation se termine** (1-2 minutes)
   - Vous devriez voir des messages comme "added X packages"
   - À la fin, vous devriez voir "audited X packages"

---

## ⚙️ PARTIE 4 : Configurer les variables d'environnement

### Étape 4.1 : Trouver votre URL Google Sheets

1. **Ouvrez votre Google Sheet** contenant les recettes
2. **Assurez-vous que le sheet est partagé en lecture publique** :
   - Cliquez sur "Partager" (en haut à droite)
   - Cliquez sur "Modifier l'accès"
   - Sélectionnez "Toute personne disposant du lien" avec le rôle "Lecteur"
   - Cliquez sur "Terminé"

3. **Récupérez l'URL d'export CSV** :
   - L'URL de votre Google Sheet ressemble à :
     ```
     https://docs.google.com/spreadsheets/d/1egJ5SxzoiSLWnLsqgs7g5guQ97R24VZIZ5uLvwTjqFk/edit#gid=0
     ```
   - Pour obtenir l'URL d'export CSV, remplacez `/edit#gid=0` par `/export?format=csv&gid=0`
   - L'URL finale devrait ressembler à :
     ```
     https://docs.google.com/spreadsheets/d/1egJ5SxzoiSLWnLsqgs7g5guQ97R24VZIZ5uLvwTjqFk/export?format=csv&gid=0
     ```
   - ⚠️ **Notez cette URL complète**

### Étape 4.2 : Créer le fichier .env.local

1. **Dans le dossier de votre projet**, créez un fichier nommé `.env.local`
   - Si le fichier existe déjà, ouvrez-le
   - Sinon, créez-le avec un éditeur de texte

2. **Ajoutez ces lignes** (remplacez les valeurs entre `<>` par vos vraies valeurs) :

   ```env
   # ============================================
   # SUPABASE - Configuration de la base de données
   # ============================================
   # Remplacez xxxxx par votre Project URL de Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   
   # Remplacez cette longue clé par votre anon public key de Supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   
   # ============================================
   # GOOGLE SHEETS - Temporaire (pour la migration)
   # ============================================
   # Remplacez cette URL par votre URL d'export CSV de Google Sheets
   SHEET_RECIPES_CSV_URL=https://docs.google.com/spreadsheets/d/xxxxxxxxxxxxx/export?format=csv&gid=0
   
   # ============================================
   # OPENAI - Optionnel
   # ============================================
   # Clé API OpenAI (optionnel, pour l'analyse de photos)
   OPENAI_API_KEY=sk-...
   ```

3. **Exemple concret** (remplacez par vos vraies valeurs) :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SHEET_RECIPES_CSV_URL=https://docs.google.com/spreadsheets/d/1egJ5SxzoiSLWnLsqgs7g5guQ97R24VZIZ5uLvwTjqFk/export?format=csv&gid=0
   ```

4. **⚠️ Important** :
   - Ne mettez **PAS d'espaces** autour du signe `=`
   - Ne mettez **PAS de guillemets** autour des valeurs
   - Chaque variable doit être sur **une seule ligne**
   - Ne laissez **PAS de lignes vides** entre les variables (ou alors avec `#` pour les commentaires)

5. **Sauvegardez le fichier** (`Ctrl+S`)

---

## 📥 PARTIE 5 : Migrer les données

### Étape 5.1 : Vérifier que tout est prêt

Avant de lancer la migration, vérifiez :

- [ ] Le projet Supabase est créé
- [ ] La table `recipes` existe dans Supabase (Table Editor)
- [ ] Le fichier `.env.local` est créé avec les bonnes valeurs
- [ ] Les dépendances sont installées (`npm install` a été exécuté)
- [ ] Vous avez l'URL d'export CSV de votre Google Sheet

### Étape 5.2 : Lancer le script de migration

1. **Ouvrez un terminal** dans le dossier de votre projet

2. **Exécutez la commande** :
   ```powershell
   npm run migrate:supabase
   ```

3. **Le script va** :
   - ✅ Vérifier que les variables d'environnement sont configurées
   - ✅ Se connecter à votre Google Sheet
   - ✅ Télécharger toutes les recettes
   - ✅ Les transformer au bon format
   - ✅ Les insérer dans Supabase

4. **Vous verrez des messages** comme :
   ```
   🚀 Début de la migration vers Supabase...
   
   📥 Étape 1: Récupération des données depuis Google Sheets...
      ✅ CSV récupéré (12345 caractères)
   
   📊 Étape 2: Parsing du CSV...
      ✅ 150 lignes parsées
   
   🔄 Étape 3: Transformation des données...
      ✅ 150 recettes transformées
   
   🔍 Étape 4: Vérification des recettes existantes...
      ℹ️  0 recettes déjà présentes dans Supabase
   
   💾 Étape 5: Insertion dans Supabase...
      ✅ Batch 1/2: 100 recettes traitées
      ✅ Batch 2/2: 50 recettes traitées
   
   📊 Résumé de la migration:
      ✅ 150 nouvelles recettes insérées
      🔄 0 recettes mises à jour
      📦 Total: 150 recettes traitées
   
   🎉 Migration terminée avec succès !
   ```

### Étape 5.3 : Vérifier que les données sont bien dans Supabase

1. **Retournez dans Supabase**
2. Allez dans **"Table Editor"** → **"recipes"**
3. **Vous devriez voir toutes vos recettes** dans le tableau
4. **Vérifiez quelques recettes** :
   - Cliquez sur une ligne pour voir les détails
   - Vérifiez que les colonnes sont bien remplies (nom, type, ingrédients, etc.)

---

## ✅ PARTIE 6 : Tester l'application

### Étape 6.1 : Démarrer l'application

1. **Dans votre terminal**, exécutez :
   ```powershell
   npm run dev
   ```

2. **Attendez** que vous voyiez :
   ```
   ▲ Next.js 16.0.3
   - Local:        http://localhost:3000
   ```

3. **Ouvrez votre navigateur** et allez sur `http://localhost:3000`

### Étape 6.2 : Vérifier que tout fonctionne

Vérifiez que :

- [ ] ✅ Les recettes s'affichent sur la page d'accueil
- [ ] ✅ Les filtres fonctionnent (sucré/salé, difficulté, etc.)
- [ ] ✅ Les images des recettes se chargent
- [ ] ✅ La recherche fonctionne
- [ ] ✅ Pas d'erreurs dans la console du navigateur (F12 → Console)

### Étape 6.3 : Vérifier les logs

1. **Ouvrez la console du navigateur** (F12 → Console)
2. **Vous devriez voir** des messages comme :
   ```
   [Recipes] Récupération des recettes depuis Supabase...
   [Recipes] 150 recettes récupérées depuis Supabase (75 sucrées, 75 salées)
   ```
3. **Si vous voyez "Supabase"** dans les logs → ✅ C'est bon, vous utilisez Supabase !
4. **Si vous voyez "Google Sheets"** → ❌ Vérifiez vos variables d'environnement

---

## 🚀 PARTIE 7 : Déployer sur Vercel

Une fois que tout fonctionne en local :

### Étape 7.1 : Ajouter les variables dans Vercel

1. **Allez sur [vercel.com](https://vercel.com)** et connectez-vous
2. **Sélectionnez votre projet** `foodlane-app`
3. Allez dans **"Settings"** → **"Environment Variables"**
4. **Ajoutez ces deux variables** :

   **Variable 1 :**
   - **Name** : `NEXT_PUBLIC_SUPABASE_URL`
   - **Value** : Votre Project URL (ex: `https://abcdefghijklmnop.supabase.co`)
   - **Environments** : Cochez ✅ Production, ✅ Preview, ✅ Development

   **Variable 2 :**
   - **Name** : `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value** : Votre anon public key (la longue chaîne qui commence par `eyJ...`)
   - **Environments** : Cochez ✅ Production, ✅ Preview, ✅ Development

5. **Cliquez sur "Save"** pour chaque variable

### Étape 7.2 : Redéployer

1. **Allez dans "Deployments"**
2. Cliquez sur les **"..."** à côté du dernier déploiement
3. Cliquez sur **"Redeploy"**
4. **Attendez** que le déploiement se termine (2-3 minutes)

### Étape 7.3 : Tester en production

1. **Ouvrez l'URL de votre application** sur Vercel
2. **Vérifiez** que les recettes s'affichent correctement
3. **Testez** quelques fonctionnalités (filtres, recherche, etc.)

---

## 🎉 PARTIE 8 : Nettoyage (optionnel)

Une fois que tout fonctionne parfaitement :

### Vous pouvez supprimer la variable Google Sheets

1. **Dans `.env.local`** : Supprimez ou commentez la ligne `SHEET_RECIPES_CSV_URL`
2. **Dans Vercel** : Supprimez la variable `SHEET_RECIPES_CSV_URL` des Environment Variables

⚠️ **Ne le faites que si tout fonctionne bien !** Vous pouvez la garder comme backup.

---

## 🐛 Dépannage

### Erreur : "Missing Supabase environment variables"

**Solution** : Vérifiez que vous avez bien créé le fichier `.env.local` avec les bonnes variables.

### Erreur : "relation 'recipes' does not exist"

**Solution** : Vous n'avez pas créé la table. Retournez à la PARTIE 2 et exécutez le script SQL.

### Erreur : "Invalid API key"

**Solution** : Vérifiez que vous avez bien copié la **anon public key** (pas la service_role key) dans `.env.local`.

### Le script de migration ne trouve pas les recettes

**Solutions** :
1. Vérifiez que votre Google Sheet est bien partagé en lecture publique
2. Vérifiez que l'URL `SHEET_RECIPES_CSV_URL` est correcte (doit se terminer par `/export?format=csv&gid=0`)
3. Testez l'URL dans votre navigateur : elle devrait télécharger un fichier CSV

### Les recettes ne s'affichent pas dans l'application

**Solutions** :
1. Vérifiez les logs dans la console du navigateur (F12)
2. Vérifiez que les données sont bien dans Supabase (Table Editor)
3. Vérifiez que les variables d'environnement sont bien configurées
4. Redémarrez le serveur de développement (`Ctrl+C` puis `npm run dev`)

### Erreur lors de l'insertion dans Supabase

**Solutions** :
1. Vérifiez que la table existe bien dans Supabase
2. Vérifiez que vous avez bien les permissions (anon key)
3. Vérifiez les logs dans Supabase : **"Logs"** → **"API Logs"**

---

## 📊 Structure des données

Votre Google Sheet doit avoir ces colonnes (ou équivalent) :

| Colonne Google Sheet | Colonne Supabase | Type |
|---------------------|------------------|------|
| ID | id | text |
| Type (sucré/salé) | type | text |
| Difficulté (Facile/Moyen/Difficile) | difficulte | text |
| Temps de préparation (min) | temps_preparation_min | integer |
| Catégorie temps (sélection) | categorie_temps | text |
| Nombre de personnes | nb_personnes | integer |
| Nom de la recette | nom | text |
| Description courte | description_courte | text |
| Ingrédients + quantités (séparés par ;) | ingredients | text |
| Instructions (étapes séparées par ;) | instructions | text |
| Équipements nécessaires (séparés par ;) | equipements | text |
| Calories (pour une portion) | calories | integer (nullable) |
| image_url | image_url | text (nullable) |

Le script de migration gère automatiquement les différences de noms de colonnes.

---

## ✅ Checklist finale

Avant de considérer la migration terminée :

- [ ] Projet Supabase créé
- [ ] Table `recipes` créée dans Supabase
- [ ] Variables d'environnement configurées (`.env.local`)
- [ ] Script de migration exécuté avec succès
- [ ] Données visibles dans Supabase (Table Editor)
- [ ] Application fonctionne en local avec Supabase
- [ ] Variables ajoutées dans Vercel
- [ ] Application déployée et fonctionne en production
- [ ] Testé sur mobile

---

**🎉 Félicitations ! Votre application utilise maintenant Supabase !**

Pour toute question, consultez la section Dépannage ou la documentation Supabase : https://supabase.com/docs

