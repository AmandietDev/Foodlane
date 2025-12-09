# 📋 Résumé : Migration Google Sheets → Supabase

## 🎯 Objectif
Transférer toutes vos recettes depuis votre Google Sheet vers Supabase.

---

## ⚡ Étapes rapides (20-30 minutes)

### 1️⃣ Créer Supabase (5 min)
- [supabase.com](https://supabase.com) → Créer compte → Nouveau projet
- Noter : **Project URL** et **anon public key** (Settings → API)

### 2️⃣ Créer la table (2 min)
- SQL Editor → Coller le contenu de `supabase-schema.sql` → Run

### 3️⃣ Installer (1 min)
```bash
npm install
```

### 4️⃣ Configurer `.env.local` (2 min)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SHEET_RECIPES_CSV_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0
```

### 5️⃣ Migrer les données (2 min)
```bash
npm run migrate:supabase
```

### 6️⃣ Tester (1 min)
```bash
npm run dev
```
Vérifier que les recettes s'affichent.

### 7️⃣ Déployer sur Vercel
- Ajouter les variables Supabase dans Vercel → Redéployer

---

## 📖 Guide complet
Consultez **`GUIDE_MIGRATION_GOOGLE_SHEETS_VERS_SUPABASE.md`** pour les détails de chaque étape.

---

## 🔍 Comment obtenir l'URL CSV de Google Sheets ?

1. Ouvrez votre Google Sheet
2. Partagez-le en lecture publique (Partager → Toute personne disposant du lien)
3. L'URL ressemble à :
   ```
   https://docs.google.com/spreadsheets/d/1egJ5SxzoiSLWnLsqgs7g5guQ97R24VZIZ5uLvwTjqFk/edit#gid=0
   ```
4. Remplacez `/edit#gid=0` par `/export?format=csv&gid=0`
5. URL finale :
   ```
   https://docs.google.com/spreadsheets/d/1egJ5SxzoiSLWnLsqgs7g5guQ97R24VZIZ5uLvwTjqFk/export?format=csv&gid=0
   ```

---

## ✅ Après la migration

Votre application utilisera automatiquement Supabase si configuré, sinon Google Sheets (fallback).

Pour vérifier : Regardez les logs dans la console du navigateur (F12). Vous devriez voir "Supabase" au lieu de "Google Sheets".

