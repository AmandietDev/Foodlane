# 🚀 Fonctionnalités à développer dans le futur

Ce fichier liste les fonctionnalités qui ont été retirées du MVP pour simplifier le développement initial, mais qui pourront être ajoutées plus tard.

---

## 🔐 Authentification OAuth

### Connexion avec Google et Facebook

**Statut** : Retiré du MVP pour simplifier

**Raison** : La configuration OAuth (Google OAuth, Facebook OAuth) est complexe et nécessite :
- Configuration des applications OAuth dans Google Cloud Console
- Configuration des applications OAuth dans Facebook Developer
- Configuration dans Supabase Dashboard
- Gestion des callbacks et redirections
- Gestion des erreurs spécifiques à chaque provider

**Ce qui a été retiré** :
- Boutons "Continuer avec Google" et "Continuer avec Facebook" sur la page de connexion
- Fonctions `handleGoogleLogin()` et `handleFacebookLogin()`
- Code OAuth dans `app/login/page.tsx`

**Pour réintégrer plus tard** :
1. Réactiver les boutons OAuth dans `app/login/page.tsx`
2. Configurer Google OAuth dans Google Cloud Console
3. Configurer Facebook OAuth dans Facebook Developer
4. Configurer les providers dans Supabase Dashboard
5. Tester les flux de connexion OAuth
6. Gérer la création automatique des profils lors de la première connexion OAuth

**Fichiers de référence** (si besoin) :
- `GUIDE_OAUTH_GOOGLE_FACEBOOK.md` (si ce fichier existe)

---

## 📝 Notes

- Cette liste sera mise à jour au fur et à mesure que d'autres fonctionnalités sont retirées du MVP
- Prioriser les fonctionnalités selon les retours utilisateurs après le lancement du MVP

