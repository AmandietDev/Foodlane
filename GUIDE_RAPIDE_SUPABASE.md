# ⚡ Guide rapide - Migration vers Supabase

## 📝 Checklist rapide

### 1. Créer le projet Supabase (5 min)
- [ ] Aller sur [supabase.com](https://supabase.com)
- [ ] Créer un compte / Se connecter
- [ ] Créer un nouveau projet
- [ ] Noter le **Project URL** et l'**anon public key** (Settings → API)

### 2. Créer la table (2 min)
- [ ] Aller dans **SQL Editor** dans Supabase
- [ ] Copier le contenu de `supabase-schema.sql`
- [ ] Coller et exécuter (Run)

### 3. Installer les dépendances (1 min)
```bash
npm install
```

### 4. Configurer les variables d'environnement (2 min)
Créer/modifier `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SHEET_RECIPES_CSV_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0
```

### 5. Migrer les données (2 min)
```bash
npm run migrate:supabase
```

### 6. Tester (1 min)
```bash
npm run dev
```
Ouvrir l'application et vérifier que les recettes s'affichent.

### 7. Déployer sur Vercel
- [ ] Ajouter `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans Vercel
- [ ] Redéployer

---

## 🎯 Total : ~15 minutes

Pour plus de détails, consultez `MIGRATION_SUPABASE.md`

