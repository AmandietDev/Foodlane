import * as dotenv from 'dotenv';

// Charge les variables depuis .env.local pour ce script
dotenv.config({ path: '.env.local' });

import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import type { Recipe } from '../app/src/lib/recipes';


/**
 * Script de migration des recettes depuis Google Sheets vers Supabase
 * 
 * Usage: npm run migrate:supabase
 * 
 * Prérequis:
 * - Avoir configuré NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - Avoir configuré SHEET_RECIPES_CSV_URL (temporairement pour la migration)
 * - Avoir créé la table recipes dans Supabase
 */

// Créer le client Supabase pour le script
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateRecipes() {
  console.log('🚀 Début de la migration vers Supabase...\n');

  // Vérifier les variables d'environnement
  const sheetUrl = process.env.SHEET_RECIPES_CSV_URL;
  if (!sheetUrl) {
    console.error('❌ ERREUR: SHEET_RECIPES_CSV_URL n\'est pas défini');
    console.error('   Ajoutez cette variable dans votre fichier .env.local');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERREUR: Variables Supabase manquantes');
    console.error('   Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définis');
    process.exit(1);
  }

  try {
    // 1. Récupérer les données depuis Google Sheets
    console.log('📥 Étape 1: Récupération des données depuis Google Sheets...');
    const response = await fetch(sheetUrl, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log(`   ✅ CSV récupéré (${csvText.length} caractères)\n`);

    // 2. Parser le CSV
    console.log('📊 Étape 2: Parsing du CSV...');
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data;
    console.log(`   ✅ ${rows.length} lignes parsées\n`);

    // 3. Transformer les données
    console.log('🔄 Étape 3: Transformation des données...');
    const recipes: Recipe[] = rows
      .filter((row) => {
        const nom = row['Nom de la recette'];
        return nom && nom.trim().length > 0;
      })
      .map((row, index) => {
        const type = (row['Type (sucré/salé)'] || '').trim();
        const difficulte = (row['Difficulté (Facile/Moyen/Difficile)'] || '').trim();
        const tempsPrep = (row['Temps de préparation (min)'] || '').trim();
        const categorieTemps = (row['Catégorie temps (sélection)'] || '').trim();
        const nbPersonnes = (row['Nombre de personnes'] || '').trim();
        const nom = (row['Nom de la recette'] || '').trim();
        const description = (row['Description courte'] || '').trim();
        const ingredients = (row['Ingrédients + quantités (séparés par ;)'] || '').trim();
        const instructions = (row['Instructions (étapes séparées par ;)'] || '').trim();
        const equipements = (row['Équipements nécessaires (séparés par ;)'] || '').trim();
        const calories = (row['Calories (pour une portion)'] || '').trim();
        const imageUrl = (row['image_url'] || '').trim();

        return {
          id: (row['ID'] && row['ID']!.toString().trim()) || `R_${index + 1}`,
          type,
          difficulte,
          temps_preparation_min: tempsPrep ? Number(tempsPrep) : 0,
          categorie_temps: categorieTemps,
          nb_personnes: nbPersonnes ? Number(nbPersonnes) : 0,
          nom,
          description_courte: description,
          ingredients,
          instructions,
          equipements,
          calories: calories ? Number(calories) : undefined,
          image_url: imageUrl,
        };
      });

    console.log(`   ✅ ${recipes.length} recettes transformées\n`);

    // 4. Vérifier si des recettes existent déjà dans Supabase
    console.log('🔍 Étape 4: Vérification des recettes existantes...');
    const { data: existingRecipes, error: checkError } = await supabase
      .from('recipes')
      .select('id');

    if (checkError) {
      throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
    }

    const existingIds = new Set(existingRecipes?.map((r) => r.id) || []);
    console.log(`   ℹ️  ${existingIds.size} recettes déjà présentes dans Supabase\n`);

    // 5. Insérer les recettes dans Supabase
    console.log('💾 Étape 5: Insertion dans Supabase...');
    
    // Préparer les données pour l'insertion
    const recipesToInsert = recipes.map((recipe) => ({
      id: recipe.id,
      type: recipe.type,
      difficulte: recipe.difficulte,
      temps_preparation_min: recipe.temps_preparation_min,
      categorie_temps: recipe.categorie_temps,
      nb_personnes: recipe.nb_personnes,
      nom: recipe.nom,
      description_courte: recipe.description_courte,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      equipements: recipe.equipements,
      calories: recipe.calories || null,
      image_url: recipe.image_url || null,
    }));

    // Insérer par batch de 100 pour éviter les limites
    const batchSize = 100;
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < recipesToInsert.length; i += batchSize) {
      const batch = recipesToInsert.slice(i, i + batchSize);
      
      // Utiliser upsert pour éviter les doublons
      const { data, error } = await supabase
        .from('recipes')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`   ❌ Erreur lors de l'insertion du batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      } else {
        const newInBatch = batch.filter((r) => !existingIds.has(r.id)).length;
        inserted += newInBatch;
        updated += batch.length - newInBatch;
        console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recipesToInsert.length / batchSize)}: ${batch.length} recettes traitées`);
      }
    }

    console.log('\n📊 Résumé de la migration:');
    console.log(`   ✅ ${inserted} nouvelles recettes insérées`);
    console.log(`   🔄 ${updated} recettes mises à jour`);
    if (errors > 0) {
      console.log(`   ❌ ${errors} erreurs`);
    }
    console.log(`   📦 Total: ${recipes.length} recettes traitées\n`);

    console.log('🎉 Migration terminée avec succès !');
    console.log('\n💡 Prochaines étapes:');
    console.log('   1. Testez votre application pour vérifier que les recettes s\'affichent');
    console.log('   2. Une fois que tout fonctionne, vous pouvez supprimer SHEET_RECIPES_CSV_URL');
    console.log('   3. Mettez à jour les variables d\'environnement sur Vercel\n');
  } catch (error) {
    console.error('\n❌ ERREUR lors de la migration:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error('   Erreur inconnue');
    }
    process.exit(1);
  }
}

// Exécuter la migration
migrateRecipes();

