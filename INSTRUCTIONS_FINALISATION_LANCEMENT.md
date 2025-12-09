# 📋 Instructions pour Finaliser le Lancement de Foodlane

## 🎯 Objectif

Tu as presque terminé ! Il ne reste plus qu'à configurer la connexion avec Google et Facebook, puis tester que tout fonctionne. Ce document te guide étape par étape.

---

## ✅ Ce qui est déjà fait

- ✅ Le code OAuth est implémenté dans l'app
- ✅ Les boutons Google et Facebook sont prêts
- ✅ L'architecture est en place

**Il ne te reste plus qu'à configurer les services externes (Google et Facebook) et les connecter à Supabase.**

---

## 🔵 ÉTAPE 1 : Configurer Google OAuth

### 1.1 Créer un projet Google Cloud

1. Va sur [Google Cloud Console](https://console.cloud.google.com/)
2. Clique sur le menu déroulant en haut (à côté de "Google Cloud")
3. Clique sur **"Nouveau projet"** (ou "New Project")
4. Donne un nom : `Foodlane` (ou ce que tu veux)
5. Clique sur **"Créer"** (ou "Create")

### 1.2 Créer les identifiants OAuth

1. Dans le menu de gauche, va dans **"APIs et services"** > **"Identifiants"** (ou "APIs & Services" > "Credentials")
2. En haut, clique sur **"+ CRÉER DES IDENTIFIANTS"** (ou "+ CREATE CREDENTIALS")
3. Choisis **"ID client OAuth"** (ou "OAuth client ID")
4. Si c'est la première fois, Google te demandera de configurer l'écran de consentement :
   - Choisis **"Externe"** (ou "External")
   - Clique sur **"Créer"** (ou "Create")
   - Remplis les champs obligatoires (nom de l'app, email de support)
   - Clique sur **"Enregistrer et continuer"** jusqu'à la fin
5. Reviens dans **"Identifiants"** > **"+ CRÉER DES IDENTIFIANTS"** > **"ID client OAuth"**
6. Choisis **"Application Web"** (ou "Web application")
7. Donne un nom : `Foodlane Web Client`
8. Dans **"URI de redirection autorisés"** (ou "Authorized redirect URIs"), ajoute :
   ```
   https://[TON-PROJECT-ID].supabase.co/auth/v1/callback
   ```
   **⚠️ IMPORTANT** : Remplace `[TON-PROJECT-ID]` par ton Project ID Supabase.
   
   Pour trouver ton Project ID :
   - Va sur [Supabase Dashboard](https://app.supabase.com/)
   - Sélectionne ton projet
   - Dans l'URL ou dans **Settings** > **General**, tu verras ton Project ID (ex: `abcdefghijklmnop`)
   - L'URL complète ressemblera à : `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
9. Clique sur **"Créer"** (ou "Create")
10. **COPIE ET GARDE** :
    - Le **Client ID** (une longue chaîne qui commence souvent par des chiffres)
    - Le **Client Secret** (clique sur "Afficher" pour le voir)

### 1.3 Configurer dans Supabase

1. Va sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionne ton projet Foodlane
3. Dans le menu de gauche, va dans **"Authentication"** > **"Providers"**
4. Trouve **"Google"** dans la liste
5. Active le toggle **"Enable Google provider"**
6. Remplis les champs :
   - **Client ID (for OAuth)** : Colle le Client ID que tu as copié
   - **Client Secret (for OAuth)** : Colle le Client Secret que tu as copié
7. Clique sur **"Save"** en bas

✅ **Google OAuth est maintenant configuré !**

---

## 🔵 ÉTAPE 2 : Configurer Facebook OAuth

### 2.1 Créer une application Facebook

1. Va sur [Facebook Developers](https://developers.facebook.com/)
2. Si tu n'as pas de compte, crée-en un (c'est gratuit)
3. Clique sur **"Mes applications"** (ou "My Apps") en haut à droite
4. Clique sur **"Créer une application"** (ou "Create App")
5. Choisis **"Consommateur"** (ou "Consumer") comme type
6. Remplis :
   - **Nom de l'application** : `Foodlane`
   - **Email de contact de l'application** : Ton email
7. Clique sur **"Créer une application"** (ou "Create App")

### 2.2 Configurer Facebook Login

1. Dans le dashboard Facebook, tu verras un écran d'accueil
2. Cherche **"Ajouter un produit"** (ou "Add Product") ou va dans **"Products"** dans le menu de gauche
3. Trouve **"Facebook Login"** et clique sur **"Configurer"** (ou "Set Up")
4. Choisis **"Web"** comme plateforme
5. Va dans **"Paramètres"** > **"De base"** (ou "Settings" > "Basic")
6. Remplis les champs :
   - **Domaines de l'application** : `ton-domaine.com` (ton domaine de production, ou laisse vide pour l'instant)
   - **URL de la politique de confidentialité** : `https://ton-domaine.com/privacy` (optionnel pour l'instant)
   - **URL des conditions d'utilisation** : `https://ton-domaine.com/terms` (optionnel pour l'instant)
7. **COPIE ET GARDE** :
   - **ID de l'application** (ou "App ID")
   - **Clé secrète de l'application** (ou "App Secret") - Clique sur "Afficher" pour la voir

### 2.3 Configurer les URLs de redirection Facebook

1. Dans le menu de gauche, va dans **"Facebook Login"** > **"Paramètres"** (ou "Settings")
2. Dans **"URI de redirection OAuth valides"** (ou "Valid OAuth Redirect URIs"), ajoute :
   ```
   https://[TON-PROJECT-ID].supabase.co/auth/v1/callback
   ```
   (Même URL que pour Google, avec ton Project ID Supabase)
3. Clique sur **"Enregistrer les modifications"** (ou "Save Changes")

### 2.4 Configurer dans Supabase

1. Retourne sur [Supabase Dashboard](https://app.supabase.com/)
2. Va dans **"Authentication"** > **"Providers"**
3. Trouve **"Facebook"** dans la liste
4. Active le toggle **"Enable Facebook provider"**
5. Remplis les champs :
   - **Client ID (for OAuth)** : Colle l'App ID Facebook
   - **Client Secret (for OAuth)** : Colle l'App Secret Facebook
6. Clique sur **"Save"** en bas

✅ **Facebook OAuth est maintenant configuré !**

---

## 🔵 ÉTAPE 3 : Créer le trigger pour les profils

Quand un utilisateur se connecte avec Google ou Facebook, il faut créer automatiquement son profil dans la table `profiles`. Voici comment faire :

1. Va sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionne ton projet
3. Dans le menu de gauche, va dans **"SQL Editor"** (ou "SQL Editor")
4. Clique sur **"New query"** (ou "Nouvelle requête")
5. Copie-colle ce code SQL :

```sql
-- Fonction pour créer automatiquement un profil quand un utilisateur s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger qui s'exécute après chaque création d'utilisateur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

6. Clique sur **"Run"** (ou "Exécuter") en bas à droite
7. Tu devrais voir un message de succès ✅

✅ **Le trigger est maintenant actif !**

---

## 🧪 ÉTAPE 4 : Tester que tout fonctionne

### Test en local (développement)

1. Lance ton app en local :
   ```bash
   npm run dev
   ```

2. Va sur `http://localhost:3000/login`

3. **Test Google** :
   - Clique sur "Continuer avec Google"
   - Tu devrais être redirigé vers Google
   - Connecte-toi avec un compte Google
   - Tu devrais être redirigé vers l'app
   - Vérifie que tu es bien connecté (barre en haut avec "Bonjour [Prénom]")

4. **Test Facebook** :
   - Déconnecte-toi d'abord
   - Clique sur "Continuer avec Facebook"
   - Tu devrais être redirigé vers Facebook
   - Connecte-toi avec un compte Facebook
   - Tu devrais être redirigé vers l'app
   - Vérifie que tu es bien connecté

5. **Vérifier le profil** :
   - Va sur Supabase Dashboard > **"Table Editor"** > **"profiles"**
   - Tu devrais voir ton profil créé automatiquement

### Test en production

1. Déploie ton app sur ton hébergeur (Vercel, Netlify, etc.)

2. **Important** : Ajoute les URLs de production dans Google et Facebook :
   - **Google Cloud Console** : Ajoute `https://ton-domaine.com` dans les "Authorized JavaScript origins"
   - **Facebook Developers** : Ajoute `https://ton-domaine.com` dans "App Domains"

3. Teste les connexions Google et Facebook sur ton site en production

---

## ⚠️ Points d'attention

### Erreurs courantes

1. **"redirect_uri_mismatch"** :
   - Vérifie que l'URL de redirection dans Google/Facebook correspond EXACTEMENT à celle de Supabase
   - Elle doit être : `https://[TON-PROJECT-ID].supabase.co/auth/v1/callback`
   - Pas d'espace, pas de slash à la fin

2. **"Invalid client"** :
   - Vérifie que tu as bien copié-collé le Client ID et Secret (sans espaces)
   - Vérifie que les providers sont bien activés dans Supabase

3. **Le profil n'est pas créé** :
   - Vérifie que le trigger SQL a bien été créé (va dans Supabase > SQL Editor > Vérifie qu'il apparaît)
   - Vérifie les permissions RLS sur la table `profiles`

### Mode développement Facebook

- En mode développement, seuls les administrateurs/testeurs de l'app Facebook peuvent se connecter
- Pour tester, ajoute-toi comme testeur dans Facebook Developers > **"Rôles"** > **"Testeurs"**
- Pour la production, il faudra soumettre l'app à Facebook pour review (mais tu peux tester en dev d'abord)

---

## ✅ Checklist finale

Avant de lancer officiellement :

- [ ] Google OAuth configuré (Google Cloud + Supabase)
- [ ] Facebook OAuth configuré (Facebook Developers + Supabase)
- [ ] Trigger SQL créé dans Supabase
- [ ] Testé en local (Google + Facebook)
- [ ] Testé en production (Google + Facebook)
- [ ] Vérifié que les profils sont créés automatiquement
- [ ] URLs de production ajoutées dans Google et Facebook

---

## 🎉 C'est tout !

Une fois ces étapes terminées, ton app est prête à être lancée ! Les utilisateurs pourront se connecter avec :
- Email/Mot de passe ✅
- Google ✅
- Facebook ✅

Si tu as des questions ou des problèmes, n'hésite pas à me demander !

---

## 📚 Ressources utiles

- [Documentation Supabase OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Facebook Developers](https://developers.facebook.com/)
- [Supabase Dashboard](https://app.supabase.com/)

