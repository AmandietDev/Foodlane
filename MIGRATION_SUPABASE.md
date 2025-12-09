# 🗄️ Guide de migration vers Supabase

Ce guide vous accompagne étape par étape pour migrer vos recettes de Google Sheets vers Supabase.

---

## 📋 Vue d'ensemble

**Avant** : Les recettes sont stockées dans un Google Sheet et récupérées via une URL CSV  
**Après** : Les recettes sont stockées dans une base de données Supabase PostgreSQL

**Avantages de Supabase** :
- ✅ Base de données PostgreSQL professionnelle
- ✅ API REST automatique
- ✅ Authentification intégrée (pour plus tard)
- ✅ Temps de réponse plus rapides
- ✅ Meilleure scalabilité

---

## 🚀 Étape 1 : Créer un projet Supabase

### 1.1. Créer un compte

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez sur **"Start your project"** ou **"Sign in"**
3. Connectez-vous avec GitHub (recommandé) ou créez un compte

### 1.2. Créer un nouveau projet

1. Une fois connecté, cliquez sur **"New Project"**
2. Remplissez les informations :
   - **Name** : `foodlane-app` (ou un nom de votre choix)
   - **Database Password** : Créez un mot de passe fort (⚠️ **SAVEZ-LE BIEN**, vous en aurez besoin)
   - **Region** : Choisissez la région la plus proche (ex: `West Europe (Paris)`)
   - **Pricing Plan** : **Free** (suffisant pour commencer)
3. Cliquez sur **"Create new project"**
4. ⏳ Attendez 2-3 minutes que le projet soit créé

---

## 🔑 Étape 2 : Récupérer les clés d'API

Une fois le projet créé :

1. Dans le menu de gauche, cliquez sur **"Settings"** (⚙️)
2. Cliquez sur **"API"** dans le sous-menu
3. Vous verrez plusieurs informations importantes :

   **📝 Notez ces valeurs (vous en aurez besoin) :**
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (longue clé)
   - **service_role key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ gardez-la secrète)

4. **Gardez cette page ouverte** ou copiez ces valeurs dans un fichier temporaire

---

## 🗃️ Étape 3 : Créer la table dans Supabase

### 3.1. Ouvrir l'éditeur SQL

1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"New query"**

### 3.2. Exécuter le script SQL

1. Copiez le contenu du fichier `supabase-schema.sql` (que je vais créer)
2. Collez-le dans l'éditeur SQL
3. Cliquez sur **"Run"** (ou appuyez sur `Ctrl+Enter`)

**✅ Si tout va bien**, vous verrez un message de succès et la table `recipes` sera créée.

### 3.3. Vérifier la table

1. Dans le menu de gauche, cliquez sur **"Table Editor"**
2. Vous devriez voir la table **"recipes"**
3. Cliquez dessus pour voir sa structure

---

## 📥 Étape 4 : Importer vos données depuis Google Sheets

### Option A : Import manuel (pour quelques recettes)

1. Allez dans **"Table Editor"** → **"recipes"**
2. Cliquez sur **"Insert row"**
3. Remplissez les champs manuellement
4. Cliquez sur **"Save"**

### Option B : Import via script (recommandé pour beaucoup de recettes)

1. Assurez-vous d'avoir toujours accès à votre Google Sheet (via `SHEET_RECIPES_CSV_URL`)
2. Exécutez le script de migration que je vais créer :
   ```bash
   npm run migrate:supabase
   ```
3. Le script va :
   - Récupérer les données depuis Google Sheets
   - Les transformer au bon format
   - Les insérer dans Supabase

**📝 Note** : Le script nécessite que vous ayez configuré les variables d'environnement (voir Étape 5).

---

## ⚙️ Étape 5 : Configurer les variables d'environnement

### 5.1. Créer le fichier `.env.local`

Créez ou modifiez le fichier `.env.local` à la racine de votre projet :

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Ancienne configuration (à garder temporairement pour la migration)
SHEET_RECIPES_CSV_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0
```

**⚠️ Important** :
- Remplacez `https://xxxxx.supabase.co` par votre **Project URL** de l'Étape 2
- Remplacez `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` par votre **anon public key** de l'Étape 2
- Gardez temporairement `SHEET_RECIPES_CSV_URL` pour la migration

### 5.2. Pour Vercel (déploiement)

Une fois que vous avez testé en local :

1. Allez sur votre projet Vercel
2. **Settings** → **Environment Variables**
3. Ajoutez :
   - `NEXT_PUBLIC_SUPABASE_URL` = votre Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = votre anon public key
4. Vous pouvez supprimer `SHEET_RECIPES_CSV_URL` une fois la migration terminée

---

## 🔧 Étape 6 : Installer les dépendances Supabase

Dans votre terminal, à la racine du projet :

```bash
npm install @supabase/supabase-js
```

---

## ✅ Étape 7 : Tester la connexion

1. Redémarrez votre serveur de développement :
   ```bash
   npm run dev
   ```

2. Ouvrez votre application dans le navigateur
3. Vérifiez que les recettes s'affichent correctement
4. Ouvrez la console du navigateur (F12) pour voir s'il y a des erreurs

---

## 🎯 Étape 8 : Vérifier que tout fonctionne

### Tests à effectuer :

- [ ] Les recettes s'affichent sur la page d'accueil
- [ ] Les filtres fonctionnent (sucré/salé, difficulté, etc.)
- [ ] Les images des recettes se chargent
- [ ] La recherche fonctionne
- [ ] Pas d'erreurs dans la console

### Si tout fonctionne :

1. Vous pouvez supprimer la variable `SHEET_RECIPES_CSV_URL` de `.env.local`
2. Vous pouvez supprimer la variable `SHEET_RECIPES_CSV_URL` de Vercel
3. Le code continuera à utiliser Supabase automatiquement

---

## 🐛 Dépannage

### Erreur : "Invalid API key"

**Solution** : Vérifiez que vous avez bien copié la **anon public key** (pas la service_role key) dans `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Erreur : "relation 'recipes' does not exist"

**Solution** : Vérifiez que vous avez bien exécuté le script SQL dans l'Étape 3.

### Les recettes ne s'affichent pas

**Solutions** :
1. Vérifiez que vous avez bien importé les données (Étape 4)
2. Vérifiez les logs dans la console du navigateur
3. Vérifiez les logs dans Supabase : **"Logs"** → **"API Logs"**

### Erreur CORS

**Solution** : Supabase gère automatiquement CORS, mais si vous avez des problèmes, vérifiez que vous utilisez bien `NEXT_PUBLIC_SUPABASE_URL` (avec `NEXT_PUBLIC_`).

---

## 📊 Structure de la table

La table `recipes` contient les colonnes suivantes :

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | text (primary key) | Identifiant unique de la recette |
| `type` | text | "sucré" ou "salé" |
| `difficulte` | text | "Facile", "Moyen" ou "Difficile" |
| `temps_preparation_min` | integer | Temps en minutes |
| `categorie_temps` | text | Catégorie (ex: "Rapide", "Moyen") |
| `nb_personnes` | integer | Nombre de personnes |
| `nom` | text | Nom de la recette |
| `description_courte` | text | Description courte |
| `ingredients` | text | Ingrédients séparés par ";" |
| `instructions` | text | Instructions séparées par ";" |
| `equipements` | text | Équipements séparés par ";" |
| `calories` | integer (nullable) | Calories pour une portion |
| `image_url` | text (nullable) | URL de l'image |
| `created_at` | timestamp | Date de création (automatique) |
| `updated_at` | timestamp | Date de mise à jour (automatique) |

---

## 🔄 Migration future

Si vous ajoutez de nouvelles recettes :

1. **Via l'interface Supabase** : Table Editor → Insert row
2. **Via l'API** : Utilisez le client Supabase dans votre code
3. **Via CSV** : Table Editor → Import data from CSV

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Consultez la documentation Supabase : https://supabase.com/docs
2. Vérifiez les logs dans Supabase : **"Logs"** → **"API Logs"**
3. Vérifiez la console du navigateur pour les erreurs

---

**Bon courage avec la migration ! 🚀**

