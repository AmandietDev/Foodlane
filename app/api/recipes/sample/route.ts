import { NextRequest, NextResponse } from "next/server";
import { getCachedRecipes } from "../../../src/lib/recipesServerCache";

/** Échantillon léger pour outils (favoris, inspiration) — pas tout le catalogue. */
export async function GET(request: NextRequest) {
  const limit = Math.min(150, Math.max(12, Number(request.nextUrl.searchParams.get("limit") || "80")));
  const all = await getCachedRecipes();
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return NextResponse.json(
    { recipes: shuffled.slice(0, limit) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
