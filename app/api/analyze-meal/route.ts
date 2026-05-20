import { NextRequest, NextResponse } from "next/server";
import { aiOutputLanguageDirective } from "../../src/lib/aiLocale";
import type { Locale } from "../../src/lib/i18n";
import { getUserIdFromRequest } from "../../src/lib/supabaseServer";
import { requirePremiumPlus } from "../../src/lib/premiumGuard";

const VISION_LOCALES: Locale[] = ["fr", "en", "es", "de"];

function parseDataUrlImage(imageBase64: string): { mime: string; base64: string } {
  const raw = imageBase64.trim();
  const m = /^data:([^;]+);base64,([\s\S]+)$/i.exec(raw);
  if (m) {
    const mime = m[1].toLowerCase().trim();
    const base64 = m[2].replace(/\s/g, "");
    if (mime.startsWith("image/")) return { mime, base64 };
  }
  const base64 = (raw.includes(",") ? raw.split(",").slice(1).join(",") : raw).replace(/\s/g, "");
  return { mime: "image/jpeg", base64 };
}

function parseVisionJson(content: string): unknown {
  const trimmed = content.trim();
  const fenced =
    trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(fenced);
  } catch {
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(fenced.slice(start, end + 1));
    }
    throw new Error("Réponse non JSON du modèle");
  }
}

/**
 * API pour analyser une photo de repas (assistant diététique + vision).
 * Réservé au palier **Premium Plus**.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, locale: localeRaw } = body as { imageBase64?: string; locale?: string };
    const locale: Locale =
      typeof localeRaw === "string" && VISION_LOCALES.includes(localeRaw as Locale)
        ? (localeRaw as Locale)
        : "fr";

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image manquante" },
        { status: 400 }
      );
    }

    const { mime: imageMime, base64: base64Data } = parseDataUrlImage(imageBase64);

    // Vérifier si OpenAI API key est configurée
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    try {
      await requirePremiumPlus(request, userId);
    } catch (error) {
      return error as NextResponse;
    }

    if (!openaiApiKey) {
      // Mode fallback : analyse simulée (même réservée au Premium Plus côté contrôle d’accès)
      return NextResponse.json({
        ingredients: [
          { name: "Salade verte", confidence: 0.85 },
          { name: "Avocat", confidence: 0.90 },
          { name: "Crevettes", confidence: 0.80 },
          { name: "Citron", confidence: 0.75 },
          { name: "Huile d'olive", confidence: 0.70 },
        ],
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

    const ingredientLang =
      locale === "fr"
        ? "noms courts en français (ex. « pâtes », « lardons », « parmesan »)"
        : locale === "en"
          ? "short names in English (e.g. pasta, bacon, parmesan)"
          : locale === "es"
            ? "nombres cortos en español (ej. pasta, bacon, parmesano)"
            : "kurze Namen auf Deutsch (z. B. Nudeln, Speck, Parmesan)";

    const systemVision = `Tu es un expert en nutrition et diététique. Analyse les photos de repas. Règles importantes : ne jamais mentionner de calories ni d'objectifs caloriques dans ton message ou tes suggestions.

Fournis :
1. Une liste détaillée des ingrédients/aliments visibles (${ingredientLang}) avec leur niveau de confiance (0.0-1.0)
2. Un nom court pour le repas dans la même langue que l'interface utilisateur
3. Une évaluation qualitative (sans calories) : équilibre du repas, points forts, une amélioration simple

Réponds UNIQUEMENT en JSON valide, sans texte autour :
{
  "ingredients": [{"name": "nom court dans la langue de l'utilisateur", "confidence": 0.0-1.0}],
  "mealName": "nom du repas",
  "advice": {
    "rating": "VERY_GOOD" | "GOOD" | "NEEDS_IMPROVEMENT",
    "message": "évaluation bienveillante sans calories",
    "suggestions": ["suggestion 1 sans calories", "suggestion 2"]
  }
}

${aiOutputLanguageDirective(locale)}`;

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
            content: systemVision,
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
                  url: `data:${imageMime};base64,${base64Data}`,
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

    let analysis: unknown;
    try {
      analysis = parseVisionJson(content);
    } catch (parseError) {
      console.error("Erreur parsing JSON:", parseError, content.slice(0, 400));
      return NextResponse.json(
        {
          error: "Impossible d’interpréter la réponse d’analyse",
          details: parseError instanceof Error ? parseError.message : String(parseError),
        },
        { status: 502 }
      );
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

