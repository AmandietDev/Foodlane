# 🔄 Guide : Forcer un Redéploiement Complet sur Vercel

## ⚠️ Si les variables sont configurées mais l'erreur persiste

Le problème est probablement que le build n'a pas été refait avec les nouvelles variables. Suivez ces étapes **dans l'ordre** :

---

## 📋 Étape 1 : Vérifier les Variables (2 min)

1. Allez sur [vercel.com](https://vercel.com) → votre projet
2. **Settings** → **Environment Variables**
3. Vérifiez que :
   - ✅ `NEXT_PUBLIC_SUPABASE_URL` est présent
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` est présent
   - ✅ Pour chaque variable, les 3 cases sont cochées : **Production**, **Preview**, **Development**

---

## 🔄 Étape 2 : Forcer un Nouveau Build (5 min)

### Méthode 1 : Redéployer depuis Vercel (Recommandé)

1. Allez dans **Deployments**
2. Trouvez le **dernier déploiement** (en haut)
3. Cliquez sur les **3 points (⋯)** à droite
4. Sélectionnez **"Redeploy"**
5. **IMPORTANT** : Cochez **"Use existing Build Cache"** → **DÉCOCHEZ** cette case pour forcer un nouveau build
6. Cliquez sur **"Redeploy"**
7. **Attendez la fin complète du build** (2-5 minutes)

### Méthode 2 : Via Git (Alternative)

Si vous avez un dépôt Git connecté :

```bash
# Créer un commit vide pour déclencher un nouveau build
git commit --allow-empty -m "chore: force rebuild with env variables"
git push
```

---

## ✅ Étape 3 : Vérifier le Build (2 min)

Après le redéploiement :

1. Allez dans **Deployments** → cliquez sur le nouveau déploiement
2. Allez dans l'onglet **"Build Logs"**
3. Cherchez dans les logs :
   - Pas d'erreurs liées aux variables d'environnement
   - Le build s'est terminé avec succès

---

## 🔍 Étape 4 : Vérifier les Variables (1 min)

Visitez cette URL après le redéploiement :
```
https://votre-app.vercel.app/api/debug-env
```

Vous devriez voir :
```json
{
  "configured": true,
  "hasUrl": true,
  "hasKey": true,
  ...
}
```

Si vous voyez `"configured": false`, le problème persiste.

---

## 🧹 Étape 5 : Vider le Cache (1 min)

Après le redéploiement :

1. **Videz le cache du navigateur** :
   - Chrome/Edge : `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
   - Firefox : `Ctrl+F5` (Windows) ou `Cmd+Shift+R` (Mac)

2. **Ouvrez la console** (F12) et vérifiez qu'il n'y a plus l'erreur

---

## 🐛 Si l'erreur persiste encore

### Vérification 1 : Les variables sont-elles bien dans le build ?

Dans Vercel → Deployments → Build Logs, cherchez des messages comme :
- "Environment variables loaded"
- Ou vérifiez qu'il n'y a pas d'erreurs

### Vérification 2 : Le bon environnement

Assurez-vous de tester sur :
- **Production** : `https://votre-app.vercel.app`
- **Preview** : `https://votre-app-git-xxx.vercel.app`

Les variables doivent être configurées pour **les deux**.

### Vérification 3 : Supprimer et recréer les variables

Parfois, il faut supprimer et recréer les variables :

1. Vercel → Settings → Environment Variables
2. Supprimez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Recréez-les avec les mêmes valeurs
4. Cochez **Production**, **Preview**, **Development**
5. Redéployez (sans cache)

---

## 📞 Dernière vérification

Si après toutes ces étapes l'erreur persiste :

1. Partagez le résultat de `/api/debug-env`
2. Partagez une capture d'écran des Build Logs
3. Vérifiez que vous testez bien sur l'URL de production/preview (pas localhost)

