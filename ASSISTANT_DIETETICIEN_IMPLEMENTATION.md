# Assistant Diététicien - Documentation d'implémentation

## 📋 Résumé

Transformation de la fonctionnalité "Équilibre / Journal alimentaire" en un assistant diététicien personnalisé, bienveillant et actionnable, sans comptage de calories.

## 🗂️ Fichiers créés/modifiés

### Migrations Supabase

1. **`supabase/migrations/001_create_food_log_tables.sql`**
   - Crée les tables `food_log_entries`, `daily_summaries`, `weekly_insights`
   - Configure RLS (Row Level Security) pour chaque table
   - Ajoute les triggers pour `updated_at`

2. **`supabase/migrations/002_add_profile_fields.sql`**
   - Ajoute les colonnes `allergies`, `diets`, `objective`, `behavioral_preferences` à la table `profiles`
   - Utilise `DO $$` pour éviter les erreurs si les colonnes existent déjà

### Bibliothèques (lib)

3. **`app/src/lib/foodParser.ts`** (NOUVEAU)
   - Parser de repas avec dictionnaire d'aliments
   - Matching tolérant (accents, pluriels, fautes)
   - Détection d'allergènes
   - Retourne une structure `ParsedMeal` standardisée

4. **`app/src/lib/dailyAnalyzer.ts`** (NOUVEAU)
   - Moteur d'analyse journalière
   - Calcul du score (0-100) basé sur variété, structure, fibres, régularité, satiété
   - Génération de conseils (points forts, tip prioritaire, alternatives, plan demain)
   - Personnalisation par objectif et profil

5. **`app/src/lib/supabaseServer.ts`** (NOUVEAU)
   - Helper pour l'authentification dans les API routes
   - Fonction `getUserIdFromRequest()` pour récupérer l'utilisateur

### API Routes

6. **`app/api/foodlog/add/route.ts`** (NOUVEAU)
   - POST `/api/foodlog/add`
   - Ajoute un repas, parse le texte, sauvegarde, recalcule le summary
   - Input: `{ date, meal_type, raw_text, hunger_before?, satiety_after?, userId }`
   - Return: `{ entry, summary }`

7. **`app/api/foodlog/summary/route.ts`** (NOUVEAU)
   - GET `/api/foodlog/summary?date=YYYY-MM-DD`
   - Récupère ou calcule le résumé journalier
   - Return: `DailySummary` complet

8. **`app/api/foodlog/weekly/route.ts`** (NOUVEAU)
   - GET `/api/foodlog/weekly?week_start=YYYY-MM-DD`
   - Calcule les insights hebdomadaires (patterns, one_action)
   - Return: `WeeklyInsights`

### UI

9. **`app/equilibre/page.tsx`** (REFACTORISÉ COMPLÈTEMENT)
   - Nouvelle UI avec :
     - Bloc "Analyse du jour" : score, points forts, conseil prioritaire, alternatives
     - Bloc "Plan de demain" : 4 suggestions (petit-déj, déjeuner, dîner, collation)
     - Bloc "Patterns hebdomadaires" : insights de la semaine
     - Journal alimentaire avec mode ressenti (faim avant, satiété après)
   - Utilise les nouvelles APIs au lieu de localStorage
   - Ton bienveillant et non culpabilisant

## 🗄️ Structure des tables Supabase

### `food_log_entries`
```sql
- id (uuid, PK)
- user_id (uuid, FK auth.users)
- date (date)
- meal_type (text: breakfast/lunch/dinner/snack)
- raw_text (text)
- parsed (jsonb)
- confidence (int, 0-100)
- hunger_before (int, 1-5, nullable)
- satiety_after (int, 1-5, nullable)
- mood_energy (int, 1-5, nullable)
- created_at, updated_at
```

### `daily_summaries`
```sql
- id (uuid, PK)
- user_id (uuid, FK auth.users)
- date (date)
- score (int, 0-100)
- strengths (text[])
- priority_tip (text)
- tip_options (jsonb)
- missing_components (text[])
- plan_for_tomorrow (jsonb)
- meta (jsonb)
- created_at, updated_at
- UNIQUE(user_id, date)
```

### `weekly_insights`
```sql
- id (uuid, PK)
- user_id (uuid, FK auth.users)
- week_start (date)
- patterns (jsonb)
- one_action (text)
- created_at, updated_at
- UNIQUE(user_id, week_start)
```

### `profiles` (colonnes ajoutées)
```sql
- allergies (text[])
- diets (text[])
- objective (text)
- behavioral_preferences (text[])
```

## 🔧 Fonctionnement

### 1. Parser de repas

Le parser (`foodParser.ts`) :
- Normalise le texte (minuscules, enlève accents)
- Compare avec un dictionnaire d'aliments par catégorie
- Matching tolérant (contient, pluriel/singulier)
- Détecte les allergènes
- Retourne une structure standardisée avec confidence

### 2. Moteur d'analyse

Le moteur (`dailyAnalyzer.ts`) :
- **Score (0-100)** : basé sur :
  - +20 si légumes présents
  - +15 si protéines dans ≥2 repas
  - +10 si fruits présents
  - +10 si féculents au dîner (satiété)
  - +10 si fait maison (pas fast food)
  - +10 si régularité (≥2 repas structurés)
  - +5 si bonne satiété (si données)
  - +10 bonus alignement objectif
  - -30 si repas incomplets répétés

- **Conseils** : toujours génère :
  - 2-3 points forts
  - 1 conseil prioritaire (hyper clair)
  - 2 alternatives simples
  - Plan pour demain (4 repas avec 2 suggestions chacun)

### 3. Personnalisation

- **Objectifs** : `weight_loss`, `muscle_gain`, `cook_more`, `reduce_meat`, `better_energy`, `digestive_comfort`
- **Allergies** : exclusion automatique des suggestions
- **Régimes** : `vegetarian`, `vegan`, `no_pork`, `lactose_free`, etc.
- **Préférences comportementales** : "je grignote le soir", "je manque de temps", etc.

### 4. Fallback intelligent

- Si données insuffisantes : message bienveillant + 2 actions simples
- Si combinaison bizarre : suggestions génériques adaptées à l'objectif

## 🧪 Tests manuels

### Test 1 : Ajouter 3 repas et voir le score changer

1. Aller sur `/equilibre`
2. Ajouter "Salade quinoa poulet" au déjeuner
3. Vérifier que le score apparaît et que les points forts s'affichent
4. Ajouter "Pâtes bolognaise" au dîner
5. Vérifier que le score augmente
6. Ajouter "Fruit" en collation
6. Vérifier que le score augmente encore

### Test 2 : Retirer/modifier un repas → summary recalculé

1. Ajouter un repas
2. Vérifier le score
3. Supprimer le repas (bouton ✕)
4. Vérifier que le score se met à jour automatiquement

### Test 3 : Objectif "réduire viande" → aucune suggestion viande

1. Dans le profil utilisateur, définir `objective = "reduce_meat"`
2. Ajouter des repas avec viande
3. Vérifier que le plan de demain ne suggère pas de viande
4. Vérifier que les conseils mentionnent les alternatives végétales

### Test 4 : Allergie "gluten" → pas de suggestion pain/pâtes classiques

1. Dans le profil, définir `allergies = ["gluten"]`
2. Ajouter des repas
3. Vérifier que le plan de demain suggère des alternatives sans gluten
4. Vérifier que les conseils évitent le gluten

### Test 5 : Aucun repas → message onboarding

1. Aller sur `/equilibre` sans avoir ajouté de repas
2. Vérifier qu'un message bienveillant s'affiche
3. Vérifier que 2 actions simples sont proposées

### Test 6 : Mode ressenti

1. Ajouter un repas
2. Cliquer sur le bouton 💭
3. Sélectionner faim avant (1-5) et satiété après (1-5)
4. Enregistrer
5. Vérifier que les données sont sauvegardées

### Test 7 : Insights hebdomadaires

1. Ajouter des repas sur plusieurs jours de la semaine
2. Vérifier que les patterns s'affichent (ex: "Tu manques de légumes dans X% de tes repas")
3. Vérifier qu'un mini défi hebdomadaire est proposé

## 🚀 Déploiement

### 1. Migrations Supabase

Exécuter les migrations dans Supabase :

```sql
-- Migration 1 : Tables food log
-- Copier le contenu de supabase/migrations/001_create_food_log_tables.sql
-- L'exécuter dans l'éditeur SQL de Supabase

-- Migration 2 : Colonnes profiles
-- Copier le contenu de supabase/migrations/002_add_profile_fields.sql
-- L'exécuter dans l'éditeur SQL de Supabase
```

### 2. Variables d'environnement

Vérifier que ces variables sont configurées :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optionnel, pour les opérations admin)

### 3. Test en local

```bash
npm run dev
```

1. Se connecter avec un compte Premium
2. Aller sur `/equilibre`
3. Tester l'ajout de repas
4. Vérifier que le score et les conseils s'affichent

### 4. Test en production

1. Déployer sur Vercel
2. Exécuter les migrations dans Supabase (production)
3. Tester avec un compte Premium réel

## 📝 Notes importantes

### Ton & Copywriting

Tous les messages utilisent un ton :
- **Bienveillant** : "Ce que tu fais déjà bien"
- **Non culpabilisant** : "La prochaine action simple"
- **Orienté solution** : "Option rapide / option plaisir"

### Performance

- Les summaries sont mis en cache dans `daily_summaries`
- Recalcul uniquement si de nouveaux repas sont ajoutés
- Calcul côté serveur (pas de calcul lourd côté client)

### Sécurité

- RLS activé sur toutes les tables
- Chaque utilisateur ne peut lire/écrire que ses propres données
- Vérification d'authentification dans toutes les APIs

### Évolutivité

- Le dictionnaire d'aliments peut être étendu facilement
- Les règles de scoring peuvent être ajustées
- Structure JSONB permet d'ajouter des métadonnées sans migration

## 🔄 Prochaines améliorations possibles

1. **IA optionnelle** : Utiliser OpenAI pour améliorer le parser si disponible
2. **Suggestions de recettes** : Lier le plan de demain aux recettes de l'app
3. **Graphiques** : Afficher l'évolution du score sur 7/30 jours
4. **Notifications** : Rappels pour noter les repas
5. **Export** : Télécharger le journal alimentaire en PDF

## ✅ Checklist de validation

- [x] Tables créées avec RLS
- [x] Parser de repas fonctionnel
- [x] Moteur d'analyse avec scoring
- [x] APIs créées et testées
- [x] UI refactorisée
- [x] Mode ressenti implémenté
- [x] Personnalisation par objectif/profil
- [x] Fallback intelligent
- [x] Ton bienveillant dans tous les messages
- [ ] Migrations exécutées en production
- [ ] Tests manuels effectués

