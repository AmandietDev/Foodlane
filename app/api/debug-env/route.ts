import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isConfigured = !!(supabaseUrl && supabaseKey);

  return NextResponse.json({
    configured: isConfigured,
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    urlPreview: supabaseUrl 
      ? `${supabaseUrl.substring(0, 20)}...` 
      : null,
    keyPreview: supabaseKey 
      ? `${supabaseKey.substring(0, 20)}...${supabaseKey.substring(supabaseKey.length - 10)}` 
      : null,
    keyLength: supabaseKey?.length || 0,
    message: isConfigured
      ? "✅ Variables d'environnement configurées correctement"
      : "❌ Variables d'environnement manquantes. Vérifiez Vercel → Settings → Environment Variables et redéployez.",
  });
}

