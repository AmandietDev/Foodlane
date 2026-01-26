# Guide d'implémentation : Système de gating Free vs Premium

## ✅ Résumé des modifications

Un système complet de gating Free vs Premium a été mis en place dans Foodlane, avec protection côté UI et backend.

## 📁 Fichiers créés

### Composants
- **`app/components/PremiumGate.tsx`** : Composant réutilisable pour protéger les fonctionnalités Premium
  - Modes : `page`, `modal`, `disable`, `badge`
  - Affiche une page de verrouillage ou une modal selon le mode

### Helpers / Utilitaires
- **`app/src/lib/premiumGuard.ts`** : Helper pour protéger les routes API côté serveur
  - Fonction `requirePremium()` : vérifie que l'utilisateur est Premium, retourne 403 sinon
  - Fonction `isPremium()` : logique de vérification Premium (premium_active + premium_end_date)

### Pages
- **`app/billing/success/page.tsx`** : Page de succès après paiement Stripe
  - Polling automatique pour vérifier l'activation Premium
  - Redirection vers `/equilibre` une fois Premium activé
- **`app/billing/cancel/page.tsx`** : Page d'annulation après paiement Stripe

### Migrations Supabase
- **`supabase/migrations/004_add_premium_plan_to_profiles.sql`** : Ajoute le champ `premium_plan` à la table `profiles`

## 📝 Fichiers modifiés

### Protection des routes API
- **`app/api/foodlog/add/route.ts`** : Protégé avec `requirePremium()`
- **`app/api/foodlog/summary/route.ts`** : Protégé avec `requirePremium()`
- **`app/api/foodlog/weekly/route.ts`** : Protégé avec `requirePremium()`

### Protection des pages
- **`app/equilibre/page.tsx`** : Enveloppé avec `PremiumGate` mode `page`
  - Affiche une page de verrouillage si non Premium
  - Le contenu est dans `EquilibrePageContent` pour séparer la logique

### Mise à jour des types
- **`app/src/lib/profile.ts`** : Ajout de `premium_plan: "monthly" | "yearly" | null` dans `UserProfile`
- **`app/src/lib/premiumGuard.ts`** : Mise à jour pour inclure `premium_plan`

### UI / Navigation
- **`app/components/BottomNavigation.tsx`** : 
  - Utilise `usePremium()` au lieu de localStorage
  - Badge "PREMIUM" sur le lien "Équilibre" si non Premium

### Configuration Stripe
- **`app/api/create-checkout-session/route.ts`** : 
  - URLs de retour mises à jour : `/billing/success` et `/billing/cancel`

### Gestion d'abonnement
- **`app/compte/page.tsx`** : Déjà contient la section "Gérer mon abonnement" (pas de modification nécessaire)

## 🔒 Fonctionnalités protégées

### Premium uniquement
1. **Assistant diététicien** (`/equilibre`)
   - Page complète protégée avec `PremiumGate`
   - APIs `/api/foodlog/*` protégées avec `requirePremium()`

2. **Photo du frigo → recettes** (à venir)
   - L'accès sera protégé de la même manière

### Free (accessible à tous)
- Recherche d'aliments / recettes
- Enregistrement dans les collections
- Mise en favoris
- Outil de création de menus
- Génération de liste de courses (maintenant FREE)

## 🛡️ Protection à 2 niveaux

### A) UI/UX
- **Pages Premium** : Affichage d'une page de verrouillage avec CTA "Passer à Premium"
- **Boutons Premium** : Badge "PREMIUM" visible, modal au clic si non Premium
- **Navigation** : Badge "PREMIUM" sur le lien Équilibre si non Premium

### B) Backend/API
- Toutes les routes API Premium utilisent `requirePremium()`
- Retourne 403 avec `{ error: "premium_required" }` si non Premium
- Même si quelqu'un appelle l'API directement, l'accès est refusé

## 🔄 Flux après paiement Stripe

1. **Paiement réussi** → Redirection vers `/billing/success?session_id=...`
2. **Page success** :
   - Affiche "Paiement validé. Activation en cours..."
   - Polling automatique toutes les 2 secondes (max 10 tentatives)
   - Rafraîchit le profil via `refreshProfile()`
3. **Premium activé** :
   - Affiche "Premium activé ✅"
   - Redirection automatique vers `/equilibre` après 2 secondes
4. **Si timeout** :
   - Message "Activation en attente"
   - Bouton "Vérifier à nouveau"

## 📊 Source de vérité : Supabase

### Table `profiles`
- `premium_active` (boolean) : Statut Premium
- `premium_plan` (text) : "monthly" | "yearly" | null
- `premium_end_date` (timestamptz) : Date de fin d'abonnement
- `stripe_customer_id` (text) : ID client Stripe
- `stripe_subscription_id` (text) : ID abonnement Stripe

### Logique Premium
L'utilisateur est Premium si :
- `premium_active === true` ET
- (si `premium_end_date` existe) `premium_end_date > now()`

Implémenté dans :
- `app/src/lib/premiumGuard.ts` → `isPremium()`
- `app/contexts/PremiumContext.tsx` → `calculateIsPremium()`

## 🧪 Tests manuels recommandés

### Test 1 : Utilisateur Free
1. Se connecter avec un compte Free
2. Aller sur `/equilibre` → Doit afficher la page de verrouillage
3. Cliquer sur "Passer à Premium" → Redirige vers `/premium`
4. Vérifier le badge "PREMIUM" dans la navigation

### Test 2 : Utilisateur Premium
1. Se connecter avec un compte Premium
2. Aller sur `/equilibre` → Doit afficher le contenu normal
3. Ajouter un repas → Doit fonctionner
4. Vérifier que le badge "PREMIUM" n'apparaît pas dans la navigation

### Test 3 : Après paiement
1. Aller sur `/premium` avec un compte Free
2. Choisir un plan (mensuel ou annuel)
3. Cliquer sur "Souscrire à Premium"
4. Compléter le paiement Stripe (mode test)
5. Vérifier la redirection vers `/billing/success`
6. Vérifier le polling et l'activation automatique
7. Vérifier la redirection vers `/equilibre` une fois Premium activé

### Test 4 : Protection API
1. Avec un compte Free, ouvrir la console du navigateur
2. Essayer d'appeler directement `/api/foodlog/add` :
   ```javascript
   fetch('/api/foodlog/add', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ date: '2024-01-01', meal_type: 'breakfast', raw_text: 'test' })
   })
   ```
3. Vérifier que la réponse est 403 avec `{ error: "premium_required" }`

### Test 5 : Résiliation
1. Avec un compte Premium, aller sur `/compte`
2. Cliquer sur "Gérer mon abonnement"
3. Vérifier l'ouverture du Stripe Customer Portal
4. Dans le portal, annuler l'abonnement
5. Vérifier que le statut Premium se met à jour (via webhook)

## 🗄️ Migrations Supabase à exécuter

### Migration 004 : Ajouter premium_plan
```sql
-- Exécuter dans Supabase SQL Editor
-- Fichier : supabase/migrations/004_add_premium_plan_to_profiles.sql
```

Cette migration ajoute le champ `premium_plan` à la table `profiles`.

## 📌 Points importants

1. **Sécurité** : La protection backend est essentielle. Même si quelqu'un contourne l'UI, les APIs retournent 403.

2. **UX** : Le polling après paiement permet une activation immédiate sans rechargement manuel.

3. **Source de vérité** : Supabase `profiles` est la seule source de vérité. Le `PremiumContext` se rafraîchit automatiquement.

4. **Badges Premium** : Visibles mais discrets, pour informer sans être intrusifs.

5. **Gestion d'abonnement** : Discrète dans `/compte`, ouvre le Stripe Customer Portal dans un nouvel onglet.

## 🚀 Prochaines étapes (optionnel)

1. **Photo du frigo** : Protéger la route API et la page avec `PremiumGate` quand elle sera implémentée
2. **Realtime Supabase** : Écouter les changements sur `profiles` pour rafraîchir automatiquement le statut Premium
3. **Statistiques** : Ajouter un dashboard pour voir les conversions Free → Premium

---

**Date de création** : 2024
**Dernière mise à jour** : Après implémentation du système de gating

