import { NextRequest, NextResponse } from "next/server";
import { sortMealsByDisplayOrder } from "../../../../src/lib/mealOrder";
import { supabaseAdmin } from "../../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../../src/lib/supabaseServer";

export const dynamic = "force-dynamic";
const FALLBACK_RECIPE_IMAGE_URL = "/menu-generation-collage.png";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const { id } = await context.params;

  const { data: menu, error: menuErr } = await supabaseAdmin
    .from("weekly_menus")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (menuErr) {
    return NextResponse.json({ error: menuErr.message }, { status: 500 });
  }
  if (!menu) {
    return NextResponse.json({ error: "Menu introuvable" }, { status: 404 });
  }

  const { data: days, error: daysErr } = await supabaseAdmin
    .from("weekly_menu_days")
    .select("*")
    .eq("weekly_menu_id", id)
    .order("day_index", { ascending: true });

  if (daysErr) {
    return NextResponse.json({ error: daysErr.message }, { status: 500 });
  }

  const dayList = days || [];
  const dayIds = dayList.map((d) => d.id);

  let meals: Record<string, unknown[]> = {};
  if (dayIds.length) {
    const { data: mealRows, error: mealsErr } = await supabaseAdmin
      .from("weekly_menu_meals")
      .select("*")
      .in("weekly_menu_day_id", dayIds);

    if (mealsErr) {
      return NextResponse.json({ error: mealsErr.message }, { status: 500 });
    }
    const rawMeals = mealRows || [];
    const recipeIds = [
      ...new Set(
        rawMeals
          .map((m) => Number(m.recipe_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];
    let recipeById = new Map<number, Record<string, unknown>>();
    if (recipeIds.length > 0) {
      const { data: recipeRows } = await supabaseAdmin
        .from("recipes_v2")
        .select(
          "id, nom_recette, type, difficulte, temps_preparation_min, nombre_personnes, description_courte, ingredients, instructions, equipements, calories, image_url, created_at"
        )
        .in("id", recipeIds);
      recipeById = new Map((recipeRows || []).map((r) => [Number(r.id), r as Record<string, unknown>]));
    }

    meals = {};
    for (const m of rawMeals) {
      const did = m.weekly_menu_day_id as string;
      if (!meals[did]) meals[did] = [];
      const recipeId = Number(m.recipe_id);
      const recipeFromDb = recipeById.get(recipeId) || {};
      const payload = (m.recipe_payload || {}) as Record<string, unknown>;
      const safeName =
        String(payload.nom_recette || m.recipe_name || recipeFromDb.nom_recette || "").trim() || "Recette Foodlane";
      meals[did].push({
        ...m,
        recipe_name: String(m.recipe_name || "").trim() || safeName,
        recipe_payload: {
          ...recipeFromDb,
          ...payload,
          id: recipeId || Number(payload.id || recipeFromDb.id || 0),
          nom_recette: safeName,
          image_url:
            String(payload.image_url || recipeFromDb.image_url || "").trim() || FALLBACK_RECIPE_IMAGE_URL,
        },
      });
    }
  }

  const daysWithMeals = dayList.map((d) => ({
    ...d,
    meals: sortMealsByDisplayOrder((meals[d.id as string] || []) as { meal_type: string }[]),
  }));

  const { data: groceryList, error: gErr } = await supabaseAdmin
    .from("grocery_lists")
    .select("id, title, created_at, updated_at")
    .eq("weekly_menu_id", id)
    .maybeSingle();

  let grocery_items: unknown[] = [];
  if (groceryList?.id) {
    const { data: items } = await supabaseAdmin
      .from("grocery_list_items")
      .select("*")
      .eq("grocery_list_id", groceryList.id)
      .order("category", { ascending: true })
      .order("ingredient_name", { ascending: true });
    grocery_items = items || [];
  }

  return NextResponse.json({
    menu,
    days: daysWithMeals,
    grocery_list: groceryList,
    grocery_items,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré" }, { status: 503 });
  }

  const { id } = await context.params;
  let body: { saved_in_carnet?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (typeof body.saved_in_carnet !== "boolean") {
    return NextResponse.json({ error: "saved_in_carnet requis (booléen)" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("weekly_menus")
    .update({ saved_in_carnet: body.saved_in_carnet })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, saved_in_carnet")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Menu introuvable" }, { status: 404 });
  }
  return NextResponse.json({ menu: data });
}
