import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ valid: false, reason: "missing_token" });
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(token)) {
    return NextResponse.json({ valid: false, reason: "invalid_format" });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ valid: false, reason: "server" }, { status: 503 });
  }

  const { data: row, error } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("token, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ valid: false, reason: "not_found" });
  }

  if (row.used_at) {
    return NextResponse.json({ valid: false, reason: "already_used" });
  }

  const exp = new Date(row.expires_at as string).getTime();
  if (Number.isFinite(exp) && Date.now() > exp) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  return NextResponse.json({ valid: true });
}
