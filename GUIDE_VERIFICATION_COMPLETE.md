# ✅ Guide de Vérification Complète - Foodlane App

Guide complet pour vérifier toutes les fonctionnalités de l'application avant le déploiement en production.

---

## 🔐 1. AUTHENTIFICATION & COMPTES

### 1.1 Création de compte
- [ ] **Page `/login`** → Mode "Créer un compte"
  - [ ] Formulaire avec Prénom, Nom, Email, Téléphone, Mot de passe
  - [ ] Validation des champs (email valide, mot de passe min 6 caractères)
  - [ ] Création du compte dans Supabase (`auth.users`)
  - [ ] Création du profil dans la table `profiles`
  - [ ] Sauvegarde des préférences dans localStorage
  - [ ] Redirection vers l'accueil après création

### 1.2 Connexion
- [ ] **Page `/login`** → Mode "Connexion"
  - [ ] Connexion avec email + mot de passe
  - [ ] Gestion des erreurs (email/mot de passe incorrect)
  - [ ] Redirection vers l'accueil après connexion
  - [ ] Session Supabase persistante

### 1.3 Mot de passe oublié
- [ ] **Page `/login`** → Mode "Mot de passe oublié"
  - [ ] Envoi d'email de réinitialisation via Supabase
  - [ ] Message de confirmation affiché
  - [ ] ⚠️ **À VÉRIFIER** : Créer la page `/reset-password` pour finaliser la réinitialisation

### 1.4 Gestion du profil
- [ ] **Page `/compte`**
  - [ ] Affichage des informations du profil
  - [ ] Modification du profil (nom, prénom, téléphone)
  - [ ] Sauvegarde dans Supabase et localStorage
  - [ ] Déconnexion fonctionnelle

---

## 💳 2. ABONNEMENT PREMIUM & STRIPE

### 2.1 Souscription Premium
- [ ] **Page `/premium`**
  - [ ] Affichage des fonctionnalités Premium
  - [ ] Bouton "Souscrire à Premium"
  - [ ] Redirection vers Stripe Checkout
  - [ ] Paiement test réussi
  - [ ] Retour sur l'app après paiement

### 2.2 Webhook Stripe
- [ ] **Configuration du webhook dans Stripe Dashboard**
  - [ ] URL webhook : `https://votre-app.vercel.app/api/webhooks/stripe`
  - [ ] Événements à écouter :
    - ✅ `checkout.session.completed` (premier paiement)
    - ✅ `invoice.payment_succeeded` (renouvellement mensuel)
    - ✅ `invoice.payment_failed` (échec de paiement)
    - ✅ `customer.subscription.updated` (changement d'abonnement)
    - ✅ `customer.subscription.deleted` (annulation)
  - [ ] Secret webhook configuré dans Vercel (`STRIPE_WEBHOOK_SECRET`)

### 2.3 Renouvellement automatique
- [ ] **Vérification du renouvellement mensuel**
  - [ ] Le webhook `invoice.payment_succeeded` est bien géré
  - [ ] La date `premium_end_date` est mise à jour dans Supabase
  - [ ] Le statut `premium_active` reste à `true`
  - [ ] ⚠️ **TEST** : Utiliser Stripe CLI pour simuler un renouvellement

### 2.4 Résiliation d'abonnement
- [ ] **Fonctionnalité de résiliation**
  - [ ] ⚠️ **À IMPLÉMENTER** : Page ou modal pour résilier l'abonnement
  - [ ] Appel à l'API Stripe pour annuler l'abonnement
  - [ ] Le webhook `customer.subscription.deleted` désactive le premium
  - [ ] Le statut `premium_active` passe à `false` dans Supabase
  - [ ] Message de confirmation affiché à l'utilisateur

### 2.5 Vérification du statut Premium
- [ ] **Dans l'application**
  - [ ] Les fonctionnalités Premium sont débloquées si `premium_active = true`
  - [ ] Les restrictions s'appliquent si `premium_active = false`
  - [ ] Le statut est vérifié depuis Supabase (pas seulement localStorage)

---

## 🍳 3. RECETTES

### 3.1 Chargement des recettes
- [ ] **Page d'accueil (`/`)**
  - [ ] Affichage des "Recettes du moment"
  - [ ] Chargement depuis Supabase (si configuré) ou Google Sheets (fallback)
  - [ ] Gestion des erreurs si aucune recette disponible
  - [ ] Affichage des images de recettes
  - [ ] Badges diététiques affichés correctement

### 3.2 Recherche de recettes
- [ ] **Fonctionnalité de recherche**
  - [ ] ⚠️ **À VÉRIFIER** : Barre de recherche fonctionnelle
  - [ ] Recherche par nom de recette
  - [ ] Filtres par type (sucré/salé)
  - [ ] Filtres par difficulté
  - [ ] Filtres par temps de préparation
  - [ ] Résultats affichés correctement

### 3.3 Génération de recettes par ingrédients
- [ ] **Page d'accueil** → Section "Générer des recettes"
  - [ ] Ajout d'ingrédients
  - [ ] Génération de recettes selon les ingrédients
  - [ ] Affichage des résultats
  - [ ] Filtres appliqués (régimes, équipements, etc.)

### 3.4 Détails d'une recette
- [ ] **Clic sur une recette**
  - [ ] Affichage des détails complets
  - [ ] Liste des ingrédients
  - [ ] Instructions étape par étape
  - [ ] Informations nutritionnelles (si disponibles)
  - [ ] Badges diététiques

### 3.5 Favoris
- [ ] **Gestion des favoris**
  - [ ] Ajout d'une recette aux favoris (étoile)
  - [ ] Suppression d'un favori
  - [ ] Synchronisation avec Supabase
  - [ ] Page `/favoris` ou `/ressources` affiche les favoris
  - [ ] Les favoris persistent après déconnexion/reconnexion

### 3.6 Collections
- [ ] **Gestion des collections**
  - [ ] Création de collections
  - [ ] Ajout de recettes à une collection
  - [ ] Suppression de recettes d'une collection
  - [ ] Synchronisation avec Supabase
  - [ ] Affichage des collections

---

## 📅 4. MENU DE LA SEMAINE

### 4.1 Création de menu
- [ ] **Page `/menu-semaine`**
  - [ ] Sélection de recettes pour chaque jour
  - [ ] Affichage du menu de la semaine
  - [ ] Modification du menu
  - [ ] Sauvegarde du menu

### 4.2 Liste de courses
- [ ] **Génération de liste de courses**
  - [ ] Génération automatique depuis le menu
  - [ ] Regroupement par catégorie
  - [ ] Quantités calculées
  - [ ] Export/impression de la liste
  - [ ] ⚠️ **Fonctionnalité Premium** : Vérifier que c'est bien restreint

---

## 🎯 5. PRÉFÉRENCES & PROFIL

### 5.1 Préférences utilisateur
- [ ] **Page `/compte`** ou paramètres
  - [ ] Modification des préférences alimentaires
  - [ ] Sélection des régimes particuliers
  - [ ] Aversions alimentaires
  - [ ] Équipements disponibles
  - [ ] Objectifs d'usage
  - [ ] Sauvegarde dans Supabase et localStorage

### 5.2 Restrictions Premium
- [ ] **Vérification des restrictions**
  - [ ] Les régimes Premium sont bloqués si `premium_active = false`
  - [ ] Message invitant à souscrire à Premium
  - [ ] Redirection vers `/premium` si nécessaire

---

## 📱 6. NAVIGATION & INTERFACE

### 6.1 Navigation
- [ ] **Barre de navigation inférieure**
  - [ ] Onglet "Recettes" → Page d'accueil
  - [ ] Onglet "Mon carnet" → Page `/favoris` ou `/ressources`
  - [ ] Onglet "Mon suivi" → Page `/equilibre` ou `/equivalences`
  - [ ] Onglet "Menu" → Page `/menu-semaine`
  - [ ] Navigation fonctionnelle entre les pages

### 6.2 Responsive design
- [ ] **Affichage mobile**
  - [ ] Interface adaptée aux petits écrans
  - [ ] Boutons accessibles
  - [ ] Textes lisibles
  - [ ] Images bien dimensionnées

### 6.3 Thème et accessibilité
- [ ] **Thème de l'application**
  - [ ] Thème clair/sombre (si implémenté)
  - [ ] Contraste des couleurs suffisant
  - [ ] Textes lisibles

---

## 🔄 7. SYNCHRONISATION SUPABASE

### 7.1 Favoris
- [ ] **Synchronisation favoris**
  - [ ] Les favoris sont sauvegardés dans Supabase
  - [ ] Les favoris sont chargés depuis Supabase au démarrage
  - [ ] Synchronisation entre plusieurs onglets/appareils
  - [ ] Gestion des erreurs de synchronisation

### 7.2 Collections
- [ ] **Synchronisation collections**
  - [ ] Les collections sont sauvegardées dans Supabase
  - [ ] Les collections sont chargées depuis Supabase
  - [ ] Synchronisation entre appareils

### 7.3 Profil utilisateur
- [ ] **Synchronisation profil**
  - [ ] Le profil est sauvegardé dans Supabase (`profiles`)
  - [ ] Le profil est chargé depuis Supabase
  - [ ] Mise à jour en temps réel

---

## 🛡️ 8. SÉCURITÉ & ERREURS

### 8.1 Gestion des erreurs
- [ ] **Messages d'erreur clairs**
  - [ ] Erreurs de connexion
  - [ ] Erreurs de paiement
  - [ ] Erreurs de chargement de données
  - [ ] Messages d'erreur en français

### 8.2 Validation des données
- [ ] **Validation côté client et serveur**
  - [ ] Validation des emails
  - [ ] Validation des mots de passe
  - [ ] Validation des formulaires
  - [ ] Protection contre les injections

### 8.3 Variables d'environnement
- [ ] **Configuration Vercel**
  - [ ] Toutes les variables `NEXT_PUBLIC_*` sont partagées (link)
  - [ ] Toutes les variables secrètes sont privées
  - [ ] Variables configurées pour Production, Preview, Development
  - [ ] Redéploiement effectué après ajout de variables

---

## 🧪 9. TESTS STRIPE (MODE TEST)

### 9.1 Paiement test
- [ ] **Carte de test Stripe**
  - [ ] Utiliser la carte : `4242 4242 4242 4242`
  - [ ] Date d'expiration : n'importe quelle date future
  - [ ] CVC : n'importe quel 3 chiffres
  - [ ] Paiement réussi
  - [ ] Webhook reçu et traité

### 9.2 Renouvellement test
- [ ] **Simulation de renouvellement**
  - [ ] Utiliser Stripe CLI : `stripe trigger invoice.payment_succeeded`
  - [ ] Vérifier que le webhook est reçu
  - [ ] Vérifier que `premium_end_date` est mis à jour
  - [ ] Vérifier que `premium_active` reste à `true`

### 9.3 Annulation test
- [ ] **Simulation d'annulation**
  - [ ] Annuler l'abonnement depuis Stripe Dashboard
  - [ ] Vérifier que le webhook `customer.subscription.deleted` est reçu
  - [ ] Vérifier que `premium_active` passe à `false`
  - [ ] Vérifier que les fonctionnalités Premium sont bloquées

---

## 📋 10. CHECKLIST FINALE

### 10.1 Avant le déploiement
- [ ] Toutes les variables d'environnement sont configurées dans Vercel
- [ ] Le webhook Stripe est configuré avec la bonne URL
- [ ] Les politiques RLS (Row Level Security) sont configurées dans Supabase
- [ ] Les tables Supabase sont créées (`profiles`, `favorites`, `collections`, etc.)
- [ ] Les migrations de données sont effectuées (si nécessaire)

### 10.2 Après le déploiement
- [ ] Tester la création de compte sur l'URL de production
- [ ] Tester la connexion
- [ ] Tester un paiement test Stripe
- [ ] Vérifier les logs Vercel pour les erreurs
- [ ] Vérifier les logs Stripe pour les webhooks
- [ ] Vérifier les logs Supabase pour les requêtes

### 10.3 Fonctionnalités à implémenter (si manquantes)
- [ ] Page `/reset-password` pour finaliser la réinitialisation du mot de passe
- [ ] Page ou modal de résiliation d'abonnement
- [ ] Barre de recherche de recettes (si non implémentée)
- [ ] Gestion des erreurs de paiement échoué

---

## 🚨 Points d'attention critiques

1. **Renouvellement automatique** : Vérifiez que le webhook `invoice.payment_succeeded` est bien configuré et testé
2. **Résiliation** : Implémentez une interface pour que les utilisateurs puissent résilier leur abonnement
3. **Mot de passe oublié** : Créez la page `/reset-password` pour finaliser la réinitialisation
4. **Politiques RLS** : Vérifiez que les utilisateurs ne peuvent accéder qu'à leurs propres données

---

## 📞 Support & Debugging

En cas de problème :
1. Vérifiez les logs Vercel → Deployments → Build Logs
2. Vérifiez les logs Stripe → Developers → Webhooks → Logs
3. Vérifiez les logs Supabase → Logs → API Logs
4. Utilisez `/api/debug-env` pour vérifier les variables d'environnement

