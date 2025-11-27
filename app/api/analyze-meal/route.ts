import { NextRequest, NextResponse } from "next/server";

/**
 * API pour analyser une photo de repas avec IA
 * Utilise OpenAI Vision API pour identifier les aliments et générer des conseils
 */
export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image manquante" },
        { status: 400 }
      );
    }

    // Extraire le base64 pur (sans le préfixe data:image/...)
    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    // Vérifier si OpenAI API key est configurée
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      // Mode fallback : retourner une analyse simulée pour le développement
      return NextResponse.json({
        ingredients: [
          { name: "Salade verte", confidence: 0.85 },
          { name: "Avocat", confidence: 0.90 },
          { name: "Crevettes", confidence: 0.80 },
          { name: "Citron", confidence: 0.75 },
          { name: "Huile d'olive", confidence: 0.70 },
        ],
        estimatedCalories: 369,
        nutrients: {
          fats: 30,
          proteins: 13,
          carbs: 5,
          fibers: 5,
        },
        mealName: "Salade de crevettes à l'avocat",
        advice: {
          rating: "VERY_GOOD",
          message: "Excellent repas équilibré ! Cette salade contient de bonnes protéines (crevettes), des graisses saines (avocat) et des légumes verts. Parfait pour un déjeuner léger et nutritif.",
          suggestions: [
            "Ajouter quelques noix pour plus de croquant et d'oméga-3",
            "Un filet de citron supplémentaire pour plus de vitamine C",
            "Considérer ajouter des légumineuses (pois chiches) pour plus de fibres"
          ],
        },
      });
    }

    // Appel à OpenAI Vision API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en nutrition et diététique. Analyse les photos de repas et fournis :
1. Une liste détaillée des ingrédients visibles avec leur niveau de confiance
2. Une estimation des calories
3. La répartition des macronutriments (lipides, protéines, glucides, fibres en grammes)
4. Un nom pour le repas
5. Une évaluation nutritionnelle avec conseils pour améliorer/équilibrer le repas

Réponds en JSON avec cette structure :
{
  "ingredients": [{"name": "nom", "confidence": 0.0-1.0}],
  "estimatedCalories": nombre,
  "nutrients": {"fats": g, "proteins": g, "carbs": g, "fibers": g},
  "mealName": "nom du repas",
  "advice": {
    "rating": "VERY_GOOD" | "GOOD" | "NEEDS_IMPROVEMENT",
    "message": "évaluation générale",
    "suggestions": ["suggestion 1", "suggestion 2"]
  }
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse cette photo de repas et fournis une analyse nutritionnelle complète avec des conseils pour l'améliorer.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erreur OpenAI API:", errorData);
      throw new Error(`Erreur API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Réponse vide de l'API OpenAI");
    }

    // Parser le JSON de la réponse
    let analysis;
    try {
      // Extraire le JSON si c'est dans un bloc de code markdown
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Erreur parsing JSON:", parseError);
      // Fallback : essayer de parser directement
      analysis = JSON.parse(content);
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Erreur lors de l'analyse du repas:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'analyse de l'image",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

