import { NextRequest, NextResponse } from "next/server";

/**
 * API pour analyser les repas de la journée avec IA
 * Utilise OpenAI ou Anthropic (Claude) pour générer des conseils nutritionnels personnalisés
 * Retourne 2-3 points positifs et 1-2 axes d'amélioration doux
 */
export async function POST(request: NextRequest) {
  try {
    const { meals, userObjective } = await request.json();

    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return NextResponse.json(
        { error: "Aucun repas fourni" },
        { status: 400 }
      );
    }

    const providerRaw = (process.env.DIETITIAN_AI_PROVIDER || "auto").toLowerCase();
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    const provider =
      providerRaw === "openai" || providerRaw === "anthropic" || providerRaw === "auto"
        ? providerRaw
        : "auto";
    const hasOpenAi = Boolean(openaiApiKey);
    const hasAnthropic = Boolean(anthropicApiKey);

    // auto: Claude prioritaire pour l'assistant diététicien, sinon OpenAI
    const selectedProvider =
      provider === "anthropic"
        ? (hasAnthropic ? "anthropic" : hasOpenAi ? "openai" : null)
        : provider === "openai"
        ? (hasOpenAi ? "openai" : hasAnthropic ? "anthropic" : null)
        : hasAnthropic
        ? "anthropic"
        : hasOpenAi
        ? "openai"
        : null;

    if (!selectedProvider) {
      // Mode fallback : retourner une analyse simulée pour le développement
      return NextResponse.json({
        positives: [
          "Tu as varié tes repas avec des légumes et des protéines",
          "Tu as pris plusieurs repas dans la journée, ce qui est bon pour ton équilibre",
        ],
        improvements: [
          "Pense à ajouter des fruits pour compléter tes apports en vitamines",
        ],
        summary: "Ton alimentation est globalement équilibrée. Continue à varier tes repas et pense à inclure des fruits pour un équilibre optimal.",
        provider_used: "fallback",
      });
    }

    // Construire le prompt pour OpenAI
    const mealsText = meals.join(", ");
    const objectiveContext = userObjective 
      ? `L'utilisateur a pour objectif : ${userObjective}. `
      : "";

    const systemPrompt = `Tu es une diététicienne bienveillante et encourageante. 
Analyse les repas de la journée de l'utilisateur et fournis :
1. 2 à 3 points positifs (ce qui va bien dans son alimentation)
2. 1 à 2 axes d'amélioration doux et bienveillants (suggestions gentilles, pas de jugement)
3. Un résumé court et encourageant

Sois toujours positif, bienveillant et encourageant. Ne sois jamais culpabilisant.
Les axes d'amélioration doivent être présentés comme des suggestions douces, pas des critiques.

Réponds en JSON avec cette structure exacte :
{
  "positives": ["point positif 1", "point positif 2", "point positif 3"],
  "improvements": ["suggestion douce 1", "suggestion douce 2"],
  "summary": "résumé encourageant en 1-2 phrases"
}`;

    const userPrompt = `${objectiveContext}Voici ce que l'utilisateur a mangé aujourd'hui : ${mealsText}

Analyse cette journée alimentaire et fournis les points positifs et les axes d'amélioration.`;

    let content: string | null = null;

    if (selectedProvider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Erreur OpenAI API:", errorData);
        throw new Error(`Erreur API OpenAI: ${response.status}`);
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content || null;
    } else {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 800,
          temperature: 0.6,
          system: `${systemPrompt}\nNe réponds qu'en JSON valide, sans markdown.`,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Erreur Anthropic API:", errorData);
        throw new Error(`Erreur API Anthropic: ${response.status}`);
      }

      const data = await response.json();
      const firstTextBlock = Array.isArray(data?.content)
        ? data.content.find((c: { type?: string; text?: string }) => c?.type === "text")
        : null;
      content = firstTextBlock?.text || null;
    }

    if (!content) {
      throw new Error("Réponse vide du provider IA");
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

    // Valider la structure de la réponse
    if (!analysis.positives || !Array.isArray(analysis.positives)) {
      analysis.positives = ["Tu as pris plusieurs repas aujourd'hui, c'est bien pour ton équilibre"];
    }
    if (!analysis.improvements || !Array.isArray(analysis.improvements)) {
      analysis.improvements = ["Continue à varier tes repas pour un équilibre optimal"];
    }
    if (!analysis.summary || typeof analysis.summary !== "string") {
      analysis.summary = "Continue dans cette direction pour maintenir un bon équilibre alimentaire.";
    }

    return NextResponse.json({
      ...analysis,
      provider_used: selectedProvider,
    });
  } catch (error) {
    console.error("Erreur lors de l'analyse des repas:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'analyse",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

