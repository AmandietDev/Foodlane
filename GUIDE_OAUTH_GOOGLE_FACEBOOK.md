# 🔐 Guide : Configuration OAuth Google & Facebook avec Supabase

## 📋 Vue d'ensemble

Supabase gère nativement l'authentification OAuth. Il suffit de :
1. Configurer les providers dans Supabase Dashboard
2. Ajouter les credentials (Client ID & Secret)
3. Configurer les URLs de redirection
4. Implémenter les boutons dans l'app

---

## 🔵 Partie 1 : Configuration Google OAuth

### Étape 1 : Créer un projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un projet existant
3. Activer l'API "Google+ API" (ou "Google Identity Services")

### Étape 2 : Créer les credentials OAuth

1. Aller dans **APIs & Services** > **Credentials**
2. Cliquer sur **Create Credentials** > **OAuth client ID**
3. Choisir **Web application**
4. Configurer :
   - **Name** : `Foodlane Web Client`
   - **Authorized JavaScript origins** :
     ```
     http://localhost:3000
     https://ton-domaine.com
     ```
   - **Authorized redirect URIs** :
     ```
     https://[TON-PROJECT-ID].supabase.co/auth/v1/callback
     ```
     *(Remplace `[TON-PROJECT-ID]` par ton Project ID Supabase)*

5. Cliquer sur **Create**
6. **Copier le Client ID et le Client Secret** (tu en auras besoin)

### Étape 3 : Configurer dans Supabase

1. Aller sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionner ton projet
3. Aller dans **Authentication** > **Providers**
4. Trouver **Google** et l'activer
5. Remplir :
   - **Client ID (for OAuth)** : Le Client ID copié
   - **Client Secret (for OAuth)** : Le Client Secret copié
6. Cliquer sur **Save**

### Étape 4 : Vérifier les URLs de redirection

Dans Supabase Dashboard > **Authentication** > **URL Configuration**, vérifier que :
- **Site URL** : `https://ton-domaine.com` (ou `http://localhost:3000` en dev)
- **Redirect URLs** : Inclut `https://[TON-PROJECT-ID].supabase.co/auth/v1/callback`

---

## 🔵 Partie 2 : Configuration Facebook OAuth

### Étape 1 : Créer une App Facebook

1. Aller sur [Facebook Developers](https://developers.facebook.com/)
2. Cliquer sur **My Apps** > **Create App**
3. Choisir **Consumer** comme type d'app
4. Remplir :
   - **App Name** : `Foodlane`
   - **App Contact Email** : Ton email
5. Cliquer sur **Create App**

### Étape 2 : Configurer Facebook Login

1. Dans le dashboard Facebook, aller dans **Add Product**
2. Trouver **Facebook Login** et cliquer sur **Set Up**
3. Choisir **Web** comme plateforme
4. Configurer **Settings** > **Basic** :
   - **App Domains** : `ton-domaine.com`
   - **Privacy Policy URL** : `https://ton-domaine.com/privacy`
   - **Terms of Service URL** : `https://ton-domaine.com/terms`
   - **User Data Deletion** : URL optionnelle

5. Dans **Settings** > **Basic**, copier :
   - **App ID**
   - **App Secret** (cliquer sur "Show" pour le révéler)

### Étape 3 : Configurer les URLs de redirection

1. Dans **Facebook Login** > **Settings**
2. Ajouter dans **Valid OAuth Redirect URIs** :
   ```
   https://[TON-PROJECT-ID].supabase.co/auth/v1/callback
   ```
   *(Remplace `[TON-PROJECT-ID]` par ton Project ID Supabase)*

3. Cliquer sur **Save Changes**

### Étape 4 : Configurer dans Supabase

1. Dans Supabase Dashboard > **Authentication** > **Providers**
2. Trouver **Facebook** et l'activer
3. Remplir :
   - **Client ID (for OAuth)** : L'App ID Facebook
   - **Client Secret (for OAuth)** : L'App Secret Facebook
4. Cliquer sur **Save**

---

## 💻 Partie 3 : Implémentation dans le Code

### Modifier `app/login/page.tsx`

Remplacer les fonctions `handleGoogleLogin` et `handleFacebookLogin` :

```typescript
import { supabase } from "../src/lib/supabaseClient";

const handleGoogleLogin = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    
    if (error) {
      console.error("Erreur Google OAuth:", error);
      setError("Erreur lors de la connexion avec Google");
    }
  } catch (err) {
    console.error("Erreur Google OAuth:", err);
    setError("Erreur lors de la connexion avec Google");
  }
};

const handleFacebookLogin = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    
    if (error) {
      console.error("Erreur Facebook OAuth:", error);
      setError("Erreur lors de la connexion avec Facebook");
    }
  } catch (err) {
    console.error("Erreur Facebook OAuth:", err);
    setError("Erreur lors de la connexion avec Facebook");
  }
};
```

### Gérer la création du profil après OAuth

Quand un utilisateur se connecte via OAuth, il faut créer son profil dans la table `profiles`. 

**Option 1 : Trigger Supabase (recommandé)**

Créer un trigger dans Supabase qui crée automatiquement le profil :

```sql
-- Dans Supabase SQL Editor
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Option 2 : Créer le profil côté client**

Modifier `app/login/page.tsx` pour écouter les changements d'auth :

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Vérifier si le profil existe
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        // Créer le profil s'il n'existe pas
        if (!profile) {
          const fullName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          '';
          await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              full_name: fullName,
              email: session.user.email || '',
            });
        }
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

---

## 🧪 Tests

### Tester Google OAuth

1. Lancer l'app en local : `npm run dev`
2. Aller sur `/login`
3. Cliquer sur "Continuer avec Google"
4. Vérifier la redirection vers Google
5. Se connecter avec un compte Google
6. Vérifier la redirection vers l'app
7. Vérifier que le profil est créé dans `profiles`

### Tester Facebook OAuth

1. Même processus avec "Continuer avec Facebook"
2. Vérifier que ça fonctionne

---

## ⚠️ Points d'attention

### Mode développement vs Production

- **Dev** : Utiliser `http://localhost:3000` dans les URLs autorisées
- **Production** : Utiliser ton domaine réel (`https://ton-domaine.com`)

### Facebook App Review

- En mode développement, seuls les admins/testeurs de l'app peuvent se connecter
- Pour la production, il faut soumettre l'app à Facebook pour review
- **Alternative** : Utiliser le mode "Development" pour tester, puis passer en "Live" après review

### Erreurs courantes

1. **"redirect_uri_mismatch"** :
   - Vérifier que l'URL de redirection dans Google/Facebook correspond exactement à celle de Supabase
   - Inclure le protocole (`https://`) et le chemin complet

2. **"Invalid client"** :
   - Vérifier que le Client ID et Secret sont corrects dans Supabase
   - Vérifier que l'app Google/Facebook est bien activée

3. **Profil non créé** :
   - Vérifier que le trigger Supabase fonctionne
   - Vérifier les permissions RLS sur la table `profiles`

---

## 📚 Ressources

- [Supabase OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Docs](https://developers.facebook.com/docs/facebook-login/web)

---

## ✅ Checklist finale

- [ ] Google OAuth configuré dans Google Cloud Console
- [ ] Google OAuth configuré dans Supabase
- [ ] Facebook OAuth configuré dans Facebook Developers
- [ ] Facebook OAuth configuré dans Supabase
- [ ] URLs de redirection correctes partout
- [ ] Code implémenté dans `login/page.tsx`
- [ ] Trigger Supabase créé pour les profils
- [ ] Testé en local
- [ ] Testé en production

Une fois tout ça fait, l'OAuth devrait fonctionner ! 🎉

