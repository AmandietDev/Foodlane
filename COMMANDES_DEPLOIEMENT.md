# 📝 Commandes Exactes pour le Déploiement

Ce fichier contient **exactement** les commandes à copier-coller dans ton terminal.

---

## 🔵 ÉTAPE 1 : Vérifier Git

```bash
git status
```

**Si tu vois "fatal: not a git repository"** → Continue avec l'étape 2.

**Si tu vois des fichiers** → Passe directement à l'étape 3.

---

## 🔵 ÉTAPE 2 : Initialiser Git (si nécessaire)

```bash
git init
git branch -M main
```

---

## 🔵 ÉTAPE 3 : Ajouter les fichiers et faire le premier commit

```bash
# Ajouter tous les fichiers
git add .

# Vérifier ce qui va être commité
git status

# Faire le premier commit
git commit -m "chore: initial commit - Foodlane app"
```

---

## 🔵 ÉTAPE 4 : Créer le dépôt sur GitHub

1. Va sur [github.com](https://github.com)
2. Clique sur **"+"** → **"New repository"**
3. Nom : `foodlane-app`
4. **NE COCHE RIEN** (pas de README, pas de .gitignore, pas de license)
5. Clique sur **"Create repository"**
6. **COPIE L'URL HTTPS** (exemple : `https://github.com/TON-USERNAME/foodlane-app.git`)

---

## 🔵 ÉTAPE 5 : Connecter le projet à GitHub

**Remplace `TON-USERNAME` par ton vrai nom d'utilisateur GitHub !**

```bash
# Ajouter le remote GitHub
git remote add origin https://github.com/TON-USERNAME/foodlane-app.git

# Vérifier que c'est bien ajouté
git remote -v

# Pousser le code sur GitHub
git push -u origin main
```

**Si GitHub te demande de t'authentifier**, utilise :
- Ton **username GitHub** + un **Personal Access Token** (pas ton mot de passe)
- Ou connecte-toi via **GitHub Desktop**

---

## 🔵 ÉTAPE 6 : Variables d'environnement pour Vercel

Voici **exactement** les variables à ajouter dans Vercel (Settings → Environment Variables) :

### Variables à copier depuis ton `.env.local`

| Variable | Type | Environnements à cocher |
|----------|------|------------------------|
| `STRIPE_SECRET_KEY` | Secret | ✅ Production, ✅ Preview, ✅ Development |
| `STRIPE_PRICE_ID_MENSUEL` | Secret | ✅ Production, ✅ Preview, ✅ Development |
| `STRIPE_PRICE_ID_ANNUEL` | Secret | ✅ Production, ✅ Preview, ✅ Development |
| `STRIPE_WEBHOOK_SECRET` | Secret | ✅ Production, ✅ Preview, ✅ Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | ✅ Production, ✅ Preview, ✅ Development |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | ✅ Production, ✅ Preview, ✅ Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | ✅ Production, ✅ Preview, ✅ Development |
| `NEXT_PUBLIC_APP_URL` | Public | ✅ Production, ✅ Preview, ✅ Development |

**Pour `NEXT_PUBLIC_APP_URL`** : 
- Après le premier déploiement Vercel, tu auras une URL comme `https://foodlane-app.vercel.app`
- Utilise cette URL comme valeur

---

## 🔵 ÉTAPE 7 : Commandes pour les mises à jour futures

Une fois le projet déployé, pour chaque modification :

```bash
# Ajouter les fichiers modifiés
git add .

# Faire un commit
git commit -m "feat: description de la modification"

# Pousser sur GitHub (cela déclenchera automatiquement un nouveau déploiement Vercel)
git push
```

---

## ✅ Checklist Rapide

- [ ] `git status` → Vérifier l'état Git
- [ ] `git init` + `git branch -M main` (si nécessaire)
- [ ] `git add .` → Ajouter les fichiers
- [ ] `git commit -m "chore: initial commit - Foodlane app"` → Premier commit
- [ ] Créer le dépôt sur GitHub (vide, sans README)
- [ ] `git remote add origin https://github.com/TON-USERNAME/foodlane-app.git` → Connecter
- [ ] `git push -u origin main` → Pousser le code
- [ ] Importer le projet dans Vercel
- [ ] Ajouter toutes les variables d'environnement dans Vercel
- [ ] Configurer le webhook Stripe avec l'URL Vercel
- [ ] Tester le déploiement

---

**Pour plus de détails, consulte `GUIDE_DEPLOIEMENT_VERCEL.md` !**
