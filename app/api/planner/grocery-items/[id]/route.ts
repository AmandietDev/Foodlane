import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../../src/lib/supabaseServer";

export const dynamic = "force-dynamic";

async function assertItemOwnedByUser(itemId: string, userId: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data: item } = await supabaseAdmin
    .from("grocery_list_items")
    .select("id, grocery_list_id")
    .eq("id", itemId)
    .maybeSingle();

  if (!item?.grocery_list_id) return false;

  const { data: list } = await supabaseAdmin
    .from("grocery_lists")
    .select("user_id")
    .eq("id", item.grocery_list_id as string)
    .maybeSingle();

  return list?.user_id === userId;
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
  const owned = await assertItemOwnedByUser(id, userId);
  if (!owned) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  let body: { checked?: boolean; quantity?: number | null; unit?: string | null; remove?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (body.remove) {
    const { error } = await supabaseAdmin.from("grocery_list_items").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, removed: true });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.checked === "boolean") patch.checked = body.checked;
  if (body.quantity !== undefined) patch.quantity = body.quantity;
  if (body.unit !== undefined) patch.unit = body.unit;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("grocery_list_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
