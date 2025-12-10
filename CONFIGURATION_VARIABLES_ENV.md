# 🔧 Configuration des Variables d'Environnement

## ⚠️ Erreur : Variables d'environnement Supabase manquantes

Si vous voyez l'erreur `[SupabaseClient] Variables d'environnement manquantes`, suivez ces étapes :

---

## 📍 Étape 1 : Récupérer vos clés Supabase

1. Allez sur [supabase.com](https://supabase.com) et connectez-vous
2. Ouvrez votre projet Supabase
3. Allez dans **Settings** → **API**
4. Copiez ces deux valeurs :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🏠 Pour le développement local

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important** : Le fichier `.env.local` est ignoré par Git (c'est normal, il ne doit pas être commité).

---

## ☁️ Pour Vercel (Production)

### Méthode 1 : Via l'interface Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous
2. Ouvrez votre projet
3. Allez dans **Settings** → **Environment Variables**
4. Cliquez sur **Add New**
5. Ajoutez chaque variable :
   - **Key** : `NEXT_PUBLIC_SUPABASE_URL`
   - **Value** : votre URL Supabase (ex: `https://xxxxx.supabase.co`)
   - **Environments** : Cochez ✅ **Production**, ✅ **Preview**, ✅ **Development**
   - Cliquez sur **Save**
6. Répétez pour `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Méthode 2 : Via la CLI Vercel

```bash
# Installer la CLI Vercel si nécessaire
npm i -g vercel

# Se connecter
vercel login

# Ajouter les variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 🔄 Redéployer après configuration

Après avoir ajouté les variables sur Vercel :

1. Allez dans **Deployments**
2. Cliquez sur les **3 points** (⋯) du dernier déploiement
3. Sélectionnez **Redeploy**
4. Attendez la fin du déploiement

**OU** poussez un nouveau commit :

```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push
```

---

## ✅ Vérification

Après le redéploiement, l'erreur devrait disparaître. Si elle persiste :

1. Vérifiez que les variables sont bien présentes dans Vercel → Settings → Environment Variables
2. Vérifiez que vous avez coché **Production**, **Preview**, et **Development**
3. Vérifiez que vous avez bien redéployé après avoir ajouté les variables
4. Vérifiez les logs de build dans Vercel pour voir si les variables sont bien chargées

---

## 🆘 Besoin d'aide ?

Si le problème persiste, vérifiez :
- Que les clés Supabase sont correctes (copiées depuis Settings → API)
- Que les noms des variables sont exactement : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Que vous avez bien redéployé après avoir ajouté les variables

