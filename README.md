# Foodlane - Application de nutrition et diététique

Application web de suivi nutritionnel avec reconnaissance photo par IA, inspirée de Foodvisor.

## Fonctionnalités

- 📷 **Reconnaissance photo avec IA** : Prends une photo de ton repas et l'IA identifie les ingrédients, calcule les calories et les macronutriments
- 💬 **Conseils personnalisés de diététicien** : Analyse de repas avec conseils pour améliorer/équilibrer tes repas
- 📅 **Menu de la semaine** : Planifie tes repas et génère ta liste de courses
- 🍳 **Recettes personnalisées** : Trouve des recettes selon tes ingrédients disponibles

## Configuration

### Variables d'environnement

Pour utiliser les fonctionnalités IA et charger les recettes depuis Google Sheets, configurez les variables d'environnement suivantes :

```bash
OPENAI_API_KEY=votre_clé_api_openai
ANTHROPIC_API_KEY=votre_clé_api_anthropic
DIETITIAN_AI_PROVIDER=auto
SHEET_RECIPES_CSV_URL=https://docs.google.com/spreadsheets/d/1egJ5SxzoiSLWnLsqgs7g5guQ97R24VZIZ5uLvwTjqFk/export?format=csv&gid=0
```

Sans clé IA disponible, les routes concernées fonctionnent en mode fallback (réponse de démonstration).
Sans l'URL du Google Sheet, les recettes ne pourront pas être chargées.

Créez un fichier `.env.local` à la racine du projet :

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DIETITIAN_AI_PROVIDER=auto
SHEET_RECIPES_CSV_URL=https://docs.google.com/spreadsheets/d/1egJ5SxzoiSLWnLsqgs7g5guQ97R24VZIZ5uLvwTjqFk/export?format=csv&gid=0
```

#### Répartition IA recommandée dans ce projet

- **Génération de menu hebdo** (`/api/planner/generate`) : OpenAI automatiquement si `OPENAI_API_KEY` est présent.
- **Assistant diététicien texte** (`/api/analyze-daily-meals`) :
  - `DIETITIAN_AI_PROVIDER=openai` : force OpenAI.
  - `DIETITIAN_AI_PROVIDER=anthropic` : force Claude.
  - `DIETITIAN_AI_PROVIDER=auto` : essaie Claude d'abord, puis OpenAI.
- **Analyse photo de repas** (`/api/analyze-meal`) : OpenAI (vision).

#### Checklist de mise en route (local)

1. Ajouter les clés IA dans `.env.local`.
2. Redémarrer le serveur (`npm run dev`).
3. Vérifier la génération de menu depuis `/planifier` (utilisation IA auto si clé OpenAI).
4. Vérifier l'assistant diététicien avec `DIETITIAN_AI_PROVIDER` (`openai`, `anthropic` ou `auto`).

**⚠️ Important** : Dans le fichier `.env.local`, chaque variable doit être sur une seule ligne, sans guillemets autour de la valeur, et sans espaces autour du signe `=`. Format correct :

```
SHEET_RECIPES_CSV_URL=https://docs.google.com/spreadsheets/d/1egJ5SxzoiSLWnLsqgs7g5guQ97R24VZIZ5uLvwTjqFk/export?format=csv&gid=0
```

❌ **Format incorrect** (ne pas faire) :
```
SHEET_RECIPES_CSV_URL=SHEET_RECIPES_CSV_URL=https://...
SHEET_RECIPES_CSV_URL = https://...
SHEET_RECIPES_CSV_URL="https://..."
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### 📦 Guide de déploiement

Pour déployer cette application sur Vercel, consultez les guides suivants :

- **📖 Guide complet** : Voir [`DEPLOYMENT.md`](./DEPLOYMENT.md) pour un guide détaillé étape par étape
- **⚡ Commandes rapides** : Voir [`COMMANDES_DEPLOIEMENT.md`](./COMMANDES_DEPLOIEMENT.md) pour un résumé des commandes à exécuter

**Résumé rapide** :
1. Testez le build local : `npm run build`
2. Initialisez Git et poussez sur GitHub
3. Importez le projet sur Vercel
4. Configurez les variables d'environnement (`SHEET_RECIPES_CSV_URL` et optionnellement `OPENAI_API_KEY`)
5. Déployez !

Chaque push sur GitHub déclenchera automatiquement un nouveau déploiement sur Vercel.

# Application déployée