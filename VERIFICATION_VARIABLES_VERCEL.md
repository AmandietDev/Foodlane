# 🔍 Guide de Vérification - Variables d'Environnement Vercel

## ⚠️ Si vous voyez toujours l'erreur après avoir ajouté les variables

Suivez ces étapes **dans l'ordre** :

---

## 📋 Étape 1 : Vérifier dans Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous
2. Ouvrez votre projet
3. Allez dans **Settings** → **Environment Variables**

### Vérifications à faire :

- [ ] Les deux variables sont bien présentes :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] Pour **chaque variable**, vérifiez que les 3 cases sont cochées :
  - ✅ **Production**
  - ✅ **Preview**  
  - ✅ **Development**

- [ ] Les noms sont **exactement** (copier-coller pour être sûr) :
  - `NEXT_PUBLIC_SUPABASE_URL` (avec le préfixe `NEXT_PUBLIC_`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (avec le préfixe `NEXT_PUBLIC_`)

- [ ] Les valeurs ne contiennent **pas d'espaces** avant ou après

---

## 🔄 Étape 2 : Redéployer (OBLIGATOIRE)

**⚠️ IMPORTANT** : Les variables sont chargées au moment du BUILD. Si vous les avez ajoutées après le dernier build, elles ne sont **pas encore disponibles**.

1. Allez dans **Deployments** (menu de gauche)
2. Trouvez le **dernier déploiement** (en haut de la liste)
3. Cliquez sur les **3 points (⋯)** à droite du déploiement
4. Sélectionnez **"Redeploy"**
5. **Attendez la fin du build** (2-5 minutes)
   - Vous verrez un indicateur de progression
   - Ne fermez pas la page avant la fin

---

## ✅ Étape 3 : Vérifier après redéploiement

Après le redéploiement, visitez cette URL :
```
https://votre-app.vercel.app/api/debug-env
```

Vous devriez voir un JSON avec :
- `"configured": true` ✅
- `"hasUrl": true` ✅
- `"hasKey": true` ✅

Si vous voyez `"configured": false`, les variables ne sont toujours pas chargées.

---

## 🐛 Étape 4 : Vérifier les logs de build

Si l'erreur persiste après redéploiement :

1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. Allez dans l'onglet **"Build Logs"**
4. Cherchez des erreurs liées aux variables d'environnement
5. Vérifiez qu'il n'y a pas de messages d'erreur

---

## 🔧 Solutions courantes

### Problème : Les variables ne sont pas chargées après redéploiement

**Solution** :
- Vérifiez que vous avez bien coché **Production**, **Preview**, et **Development**
- Supprimez les variables et recréez-les
- Redéployez à nouveau

### Problème : Erreur "Variable not found"

**Solution** :
- Vérifiez que les noms sont **exactement** : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Pas d'espaces avant ou après le nom
- Pas de guillemets autour de la valeur

### Problème : Variables présentes mais toujours l'erreur

**Solution** :
- Videz le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
- Vérifiez que vous êtes bien sur l'URL de production (pas localhost)
- Attendez quelques minutes après le redéploiement

---

## 📞 Besoin d'aide ?

Si après avoir suivi toutes ces étapes l'erreur persiste :

1. Partagez le résultat de `/api/debug-env`
2. Partagez une capture d'écran de Vercel → Settings → Environment Variables (masquez les valeurs sensibles)
3. Partagez les logs de build de Vercel

