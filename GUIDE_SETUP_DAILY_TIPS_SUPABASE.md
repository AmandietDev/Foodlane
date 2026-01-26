# Guide de mise en place : Base de données Conseils et Défis du jour

Ce guide vous explique comment créer la table Supabase et configurer l'automatisation de l'enregistrement des conseils et défis.

## 📋 Prérequis

- Accès à votre projet Supabase
- Variables d'environnement configurées dans votre app :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🗄️ Étape 1 : Créer la table dans Supabase

### Option A : Via l'interface Supabase (Recommandé)

1. **Connectez-vous à Supabase**
   - Allez sur [https://supabase.com](https://supabase.com)
   - Sélectionnez votre projet Foodlane

2. **Accédez à l'éditeur SQL**
   - Dans le menu de gauche, cliquez sur **"SQL Editor"**
   - Cliquez sur **"New query"**

3. **Exécutez la migration SQL**
   - Copiez-collez le contenu suivant dans l'éditeur :

```sql
-- Table pour stocker l'historique des conseils et défis du jour suggérés
CREATE TABLE IF NOT EXISTS daily_tips_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  tip_id text NOT NULL,
  challenge_id text NOT NULL,
  tip_category text,
  challenge_category text,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_daily_tips_history_user_date ON daily_tips_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_tips_history_user_tip ON daily_tips_history(user_id, tip_id);
CREATE INDEX IF NOT EXISTS idx_daily_tips_history_user_challenge ON daily_tips_history(user_id, challenge_id);

-- RLS (Row Level Security)
ALTER TABLE daily_tips_history ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir uniquement leurs propres historiques
CREATE POLICY "Users can view their own daily_tips_history." 
  ON daily_tips_history FOR SELECT 
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent insérer leurs propres historiques
CREATE POLICY "Users can insert their own daily_tips_history." 
  ON daily_tips_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent mettre à jour leurs propres historiques
CREATE POLICY "Users can update their own daily_tips_history." 
  ON daily_tips_history FOR UPDATE 
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent supprimer leurs propres historiques
CREATE POLICY "Users can delete their own daily_tips_history." 
  ON daily_tips_history FOR DELETE 
  USING (auth.uid() = user_id);
```

4. **Exécutez la requête**
   - Cliquez sur **"Run"** (ou `Ctrl+Enter`)
   - Vous devriez voir un message de succès : "Success. No rows returned"

5. **Vérifiez que la table est créée**
   - Dans le menu de gauche, allez dans **"Table Editor"**
   - Vous devriez voir la table `daily_tips_history` dans la liste

### Option B : Via le fichier de migration local

Si vous utilisez Supabase CLI :

```bash
# Dans le terminal, à la racine du projet
supabase db push
```

## ✅ Étape 2 : Vérifier la structure de la table

1. **Dans Supabase, allez dans "Table Editor"**
2. **Sélectionnez la table `daily_tips_history`**
3. **Vérifiez les colonnes suivantes :**
   - `id` (uuid, primary key)
   - `user_id` (uuid, foreign key vers auth.users)
   - `date` (date)
   - `tip_id` (text)
   - `challenge_id` (text)
   - `tip_category` (text, nullable)
   - `challenge_category` (text, nullable)
   - `created_at` (timestamp)

4. **Vérifiez les politiques RLS**
   - Dans le menu de gauche, allez dans **"Authentication" → "Policies"**
   - Vous devriez voir 4 politiques pour `daily_tips_history` :
     - SELECT
     - INSERT
     - UPDATE
     - DELETE

## 🔗 Étape 3 : Vérifier la connexion à l'app

### Test rapide dans la console du navigateur

1. **Ouvrez votre app en développement**
2. **Ouvrez la console du navigateur** (F12)
3. **Allez sur la page Équilibre**
4. **Vérifiez les logs :**
   - Vous devriez voir : `[TipsHistory] Enregistré dans Supabase: { tipId: "...", challengeId: "..." }`
   - Si vous voyez des erreurs, vérifiez les variables d'environnement

### Test manuel dans Supabase

1. **Allez sur la page Équilibre de votre app**
2. **Attendez quelques secondes** (le conseil et le défi sont générés automatiquement)
3. **Dans Supabase, allez dans "Table Editor" → `daily_tips_history`**
4. **Vous devriez voir une nouvelle ligne** avec :
   - Votre `user_id`
   - La date d'aujourd'hui
   - Les IDs du conseil et du défi générés

## 🔄 Étape 4 : Comprendre l'automatisation

### Comment ça fonctionne

1. **Quand l'utilisateur ouvre la page Équilibre :**
   - La fonction `generateDailyTips()` est appelée automatiquement
   - Elle sélectionne un conseil et un défi adaptés au profil utilisateur

2. **Enregistrement automatique :**
   - Dès qu'un conseil et un défi sont générés, ils sont **automatiquement enregistrés** dans Supabase
   - La fonction `addToHistory()` est appelée avec les objets `Tip` et `Challenge`
   - L'enregistrement utilise `upsert` : si un conseil/défi existe déjà pour aujourd'hui, il est mis à jour

3. **Éviter les répétitions :**
   - Avant de générer un nouveau conseil/défi, le système récupère l'historique des 7 derniers jours
   - Les IDs déjà utilisés sont exclus de la sélection

### Code concerné

- **`app/src/lib/dailyTipsHistory.ts`** : Gestion de l'historique (Supabase + localStorage fallback)
- **`app/equilibre/page.tsx`** : Génération et enregistrement automatique
- **`app/src/lib/dailyTips.ts`** : Base de données des conseils et défis

## 🐛 Dépannage

### Problème : "Table does not exist"

**Solution :**
- Vérifiez que vous avez bien exécuté la migration SQL
- Vérifiez que vous êtes dans le bon projet Supabase

### Problème : "Permission denied" ou erreur RLS

**Solution :**
- Vérifiez que les politiques RLS sont bien créées
- Vérifiez que l'utilisateur est bien authentifié (session active)
- Dans Supabase, allez dans "Authentication" → "Policies" et vérifiez les 4 politiques

### Problème : Les conseils/défis ne s'enregistrent pas

**Vérifications :**
1. Ouvrez la console du navigateur (F12)
2. Allez sur la page Équilibre
3. Cherchez les logs `[TipsHistory]`
4. Si vous voyez une erreur, vérifiez :
   - Les variables d'environnement Supabase
   - Que l'utilisateur est connecté
   - Que la table existe dans Supabase

### Problème : Les mêmes conseils/défis reviennent

**Solution :**
- C'est normal si vous n'avez pas assez de conseils/défis dans la base
- Pour l'instant, il y a ~50 conseils et ~150 défis
- Le système évite les répétitions sur 7 jours
- Si vous voulez plus de variété, ajoutez plus d'items dans `app/src/lib/dailyTips.ts`

## 📊 Étape 5 : Visualiser l'historique

### Dans Supabase Table Editor

1. Allez dans **"Table Editor" → `daily_tips_history`**
2. Vous verrez tous les conseils/défis suggérés pour tous les utilisateurs
3. Vous pouvez filtrer par `user_id` pour voir l'historique d'un utilisateur spécifique

### Créer une vue pour l'historique utilisateur (Optionnel)

Si vous voulez créer une page dans l'app pour voir l'historique :

```sql
-- Vue pour faciliter les requêtes (optionnel)
CREATE OR REPLACE VIEW user_daily_tips_history AS
SELECT 
  dth.*,
  u.email
FROM daily_tips_history dth
JOIN auth.users u ON u.id = dth.user_id;
```

## 🎯 Résumé

✅ **Ce qui est automatique :**
- Génération d'un conseil et d'un défi à l'ouverture de la page Équilibre
- Enregistrement automatique dans Supabase
- Évite les répétitions sur 7 jours
- Fallback localStorage si Supabase n'est pas disponible

✅ **Ce que vous devez faire :**
1. Exécuter la migration SQL dans Supabase (une seule fois)
2. Vérifier que la table est créée
3. Tester en ouvrant la page Équilibre

✅ **Ce qui est optionnel :**
- Ajouter plus de conseils/défis dans `dailyTips.ts` (actuellement ~200 items, objectif 400+)
- Créer une page pour visualiser l'historique
- Ajouter des statistiques (quels conseils/défis sont les plus suggérés)

## 📝 Notes importantes

- **Un seul conseil/défi par jour** : Si l'utilisateur recharge la page, le même conseil/défi sera affiché (grâce à la contrainte UNIQUE)
- **Historique sur 30 jours** : Les données sont conservées 30 jours, puis peuvent être nettoyées
- **Sécurité** : Les utilisateurs ne peuvent voir que leurs propres conseils/défis (RLS activé)
- **Performance** : Les index permettent des requêtes rapides même avec beaucoup d'utilisateurs

---

**Besoin d'aide ?** Vérifiez les logs dans la console du navigateur (F12) pour voir les messages `[TipsHistory]`.

