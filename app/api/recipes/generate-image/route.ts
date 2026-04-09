import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";

export const dynamic = "force-dynamic";

const RECIPE_IMAGE_BUCKET = "recipe-images";

async function ensurePublicBucket(): Promise<void> {
  if (!supabaseAdmin) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === RECIPE_IMAGE_BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(RECIPE_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: "5MB",
    });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY manquante" }, { status: 503 });
  }

  let body: { recipeId?: string | number; nom?: string; nom_recette?: string; description?: string; ingredients?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const recipeId = Number(body.recipeId);
  if (!Number.isFinite(recipeId)) {
    return NextResponse.json({ error: "recipeId requis" }, { status: 400 });
  }

  // Cache persistant : si image déjà en base, on la renvoie directement.
  const { data: existing } = await supabaseAdmin
    .from("recipes_v2")
    .select("id, image_url, nom_recette, description_courte, ingredients")
    .eq("id", recipeId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }
  if (existing.image_url) {
    return NextResponse.json({ image_url: existing.image_url, cached: true });
  }

  const nom = (body.nom_recette || body.nom || existing.nom_recette || "").trim();
  const description = (body.description || existing.description_courte || "").trim();
  const ingredients = (body.ingredients || existing.ingredients || "").toString().slice(0, 500);

  const prompt = [
    `Photo culinaire réaliste et appétissante de la recette "${nom}".`,
    description ? `Contexte: ${description}.` : "",
    ingredients ? `Ingrédients principaux: ${ingredients}.` : "",
    "Style naturel, lumière douce, assiette soignée, sans texte, sans watermark, fond cuisine neutre.",
  ]
    .filter(Boolean)
    .join(" ");

  const imageRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });

  if (!imageRes.ok) {
    const errText = await imageRes.text().catch(() => "");
    return NextResponse.json({ error: `Erreur génération image: ${errText || imageRes.status}` }, { status: 502 });
  }

  const imageJson = await imageRes.json();
  const b64 = imageJson?.data?.[0]?.b64_json;
  if (!b64) {
    return NextResponse.json({ error: "Réponse image invalide" }, { status: 502 });
  }

  const bytes = Buffer.from(b64, "base64");
  await ensurePublicBucket();
  const objectPath = `${userId}/${recipeId}.png`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(RECIPE_IMAGE_BUCKET)
    .upload(objectPath, bytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json({ error: `Upload image impossible: ${uploadErr.message}` }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from(RECIPE_IMAGE_BUCKET).getPublicUrl(objectPath);
  const imageUrl = pub.publicUrl;

  const { error: updateErr } = await supabaseAdmin
    .from("recipes_v2")
    .update({ image_url: imageUrl })
    .eq("id", recipeId);

  if (updateErr) {
    return NextResponse.json({ error: `Image générée mais non sauvegardée en base: ${updateErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ image_url: imageUrl, cached: false });
}

