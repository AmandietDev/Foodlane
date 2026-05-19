import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
import { getUserIdFromRequest } from "../../../src/lib/supabaseServer";
import { rowToPlannerPreferences, type UserPreferencesRow } from "../../../src/lib/plannerServer";
import type { PlannerPreferences } from "../../../src/lib/weeklyPlanner";
import { DEFAULT_PLANNER_PREFERENCES } from "../../../src/lib/weeklyPlanner";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré (Supabase admin)" }, { status: 503 });
  }

  const { data: row, error } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[planner/preferences GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({
      completed: false,
      preferences: DEFAULT_PLANNER_PREFERENCES,
    });
  }

  const [{ data: equipment }, { data: allergies }, { data: excluded }] = await Promise.all([
    supabaseAdmin.from("user_equipment").select("equipment_key").eq("user_id", userId),
    supabaseAdmin.from("user_allergies").select("allergy_key").eq("user_id", userId),
    supabaseAdmin.from("user_excluded_ingredients").select("ingredient_name").eq("user_id", userId),
  ]);

  const prefs = rowToPlannerPreferences(row as UserPreferencesRow, equipment || [], allergies || [], excluded || []);

  return NextResponse.json({
    completed: true,
    preferences: prefs,
  });
}

type PutBody = {
  preferences: Partial<PlannerPreferences> & {
    cooking_time_preference?: string;
    household_size?: number;
    recipe_scaling_portions?: number | null;
    adults_count?: number;
    children_count?: number;
    planning_days?: number;
    meal_types?: string[];
    meal_structure?: string;
    objectives?: string[];
    dietary_filters?: string[];
    world_cuisines?: string[];
    seasonal_preference?: boolean;
    custom_goal?: string | null;
    cooking_skill_level?: string;
  };
  equipment_keys?: string[];
  allergy_keys?: string[];
  excluded_ingredients?: string[];
};

export async function PUT(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur non configuré (Supabase admin)" }, { status: 503 });
  }

  let body: PutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const p = body.preferences || {};
  const equipment_keys = body.equipment_keys ?? p.equipment_keys;
  const allergy_keys = body.allergy_keys ?? p.allergy_keys;
  const excluded_ingredients = body.excluded_ingredients ?? p.excluded_ingredients;

  const { data: existingRow } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const prev = existingRow as Record<string, unknown> | null;

  const cooking_time_preference =
    p.cooking_time_preference ??
    (prev?.cooking_time_preference as string) ??
    DEFAULT_PLANNER_PREFERENCES.cooking_time_preference;

  const household_size = Math.max(
    1,
    p.household_size !== undefined && p.household_size !== null
      ? Number(p.household_size)
      : Number(prev?.household_size) || DEFAULT_PLANNER_PREFERENCES.household_size
  );

  let recipe_scaling_portions: number | null = null;
  if (household_size === 5) {
    if (p.recipe_scaling_portions !== undefined) {
      if (p.recipe_scaling_portions === null) {
        recipe_scaling_portions = null;
      } else {
        const n = Number(p.recipe_scaling_portions);
        recipe_scaling_portions = n === 4 || n === 5 || n === 6 ? n : null;
      }
    } else if (prev?.recipe_scaling_portions != null) {
      const n = Number(prev.recipe_scaling_portions);
      recipe_scaling_portions = n === 4 || n === 5 || n === 6 ? n : null;
    }
  }

  const adults_count = Math.max(
    0,
    p.adults_count !== undefined && p.adults_count !== null
      ? Number(p.adults_count)
      : Number(prev?.adults_count) || DEFAULT_PLANNER_PREFERENCES.adults_count
  );

  const children_count = Math.max(
    0,
    p.children_count !== undefined && p.children_count !== null
      ? Number(p.children_count)
      : Number(prev?.children_count) || DEFAULT_PLANNER_PREFERENCES.children_count
  );

  const planning_days = Math.min(
    14,
    Math.max(
      1,
      p.planning_days !== undefined && p.planning_days !== null
        ? Number(p.planning_days)
        : Number(prev?.planning_days) || DEFAULT_PLANNER_PREFERENCES.planning_days
    )
  );

  const meal_types =
    p.meal_types !== undefined
      ? p.meal_types
      : Array.isArray(prev?.meal_types) && (prev.meal_types as string[]).length
        ? (prev.meal_types as string[])
        : DEFAULT_PLANNER_PREFERENCES.meal_types;

  const meal_structure =
    p.meal_structure ??
    (prev?.meal_structure as string) ??
    DEFAULT_PLANNER_PREFERENCES.meal_structure;

  const objectives =
    p.objectives !== undefined
      ? p.objectives
      : Array.isArray(prev?.objectives) && (prev.objectives as string[]).length
        ? (prev.objectives as string[])
        : DEFAULT_PLANNER_PREFERENCES.objectives;

  const dietary_filters =
    p.dietary_filters !== undefined
      ? p.dietary_filters
      : Array.isArray(prev?.dietary_filters)
        ? (prev.dietary_filters as string[])
        : DEFAULT_PLANNER_PREFERENCES.dietary_filters;

  const world_cuisines =
    p.world_cuisines !== undefined
      ? p.world_cuisines
      : Array.isArray(prev?.world_cuisines)
        ? (prev.world_cuisines as string[])
        : DEFAULT_PLANNER_PREFERENCES.world_cuisines;

  const seasonal_preference =
    p.seasonal_preference !== undefined
      ? Boolean(p.seasonal_preference)
      : prev?.seasonal_preference !== undefined
        ? Boolean(prev.seasonal_preference)
        : DEFAULT_PLANNER_PREFERENCES.seasonal_preference;

  const custom_goal =
    p.custom_goal === null
      ? null
      : p.custom_goal !== undefined
        ? String(p.custom_goal).trim().slice(0, 150) || null
        : prev?.custom_goal != null
          ? String(prev.custom_goal).trim().slice(0, 150) || null
          : null;

  const cooking_skill_level =
    p.cooking_skill_level && ["debutant", "intermediaire", "confirme"].includes(p.cooking_skill_level)
      ? p.cooking_skill_level
      : prev?.cooking_skill_level &&
          ["debutant", "intermediaire", "confirme"].includes(String(prev.cooking_skill_level))
        ? String(prev.cooking_skill_level)
        : DEFAULT_PLANNER_PREFERENCES.cooking_skill_level;

  const upsertRow = {
    user_id: userId,
    cooking_time_preference,
    household_size,
    recipe_scaling_portions,
    adults_count,
    children_count,
    planning_days,
    meal_types,
    meal_structure,
    objectives,
    dietary_filters,
    world_cuisines,
    seasonal_preference,
    custom_goal,
    cooking_skill_level,
  };

  const { error: upErr } = await supabaseAdmin.from("user_preferences").upsert(upsertRow, {
    onConflict: "user_id",
  });

  if (upErr) {
    console.error("[planner/preferences PUT] upsert", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  if (equipment_keys !== undefined) {
    await supabaseAdmin.from("user_equipment").delete().eq("user_id", userId);
    if (equipment_keys.length) {
      await supabaseAdmin.from("user_equipment").insert(
        equipment_keys.map((equipment_key: string) => ({ user_id: userId, equipment_key }))
      );
    }
  }

  if (allergy_keys !== undefined) {
    await supabaseAdmin.from("user_allergies").delete().eq("user_id", userId);
    if (allergy_keys.length) {
      await supabaseAdmin.from("user_allergies").insert(
        allergy_keys.map((allergy_key: string) => ({ user_id: userId, allergy_key }))
      );
    }
  }

  if (excluded_ingredients !== undefined) {
    await supabaseAdmin.from("user_excluded_ingredients").delete().eq("user_id", userId);
    if (excluded_ingredients.length) {
      await supabaseAdmin.from("user_excluded_ingredients").insert(
        excluded_ingredients.map((ingredient_name: string) => ({
          user_id: userId,
          ingredient_name: ingredient_name.trim(),
        }))
      );
    }
  }

  const { data: row } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  const [{ data: equipment }, { data: allergies }, { data: excluded }] = await Promise.all([
    supabaseAdmin.from("user_equipment").select("equipment_key").eq("user_id", userId),
    supabaseAdmin.from("user_allergies").select("allergy_key").eq("user_id", userId),
    supabaseAdmin.from("user_excluded_ingredients").select("ingredient_name").eq("user_id", userId),
  ]);

  const prefs = rowToPlannerPreferences(
    row as UserPreferencesRow,
    equipment || [],
    allergies || [],
    excluded || []
  );

  return NextResponse.json({ completed: true, preferences: prefs });
}
