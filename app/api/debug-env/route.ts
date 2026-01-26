import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isConfigured = !!(supabaseUrl && supabaseKey);

  // Vérifier toutes les variables d'environnement qui commencent par NEXT_PUBLIC_
  const allEnvVars = Object.keys(process.env)
    .filter(key => key.startsWith('NEXT_PUBLIC_'))
    .reduce((acc, key) => {
      acc[key] = process.env[key] ? '✅ Présent' : '❌ Manquant';
      return acc;
    }, {} as Record<string, string>);

  return NextResponse.json({
    configured: isConfigured,
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    urlPreview: supabaseUrl 
      ? `${supabaseUrl.substring(0, 30)}...` 
      : null,
    keyPreview: supabaseKey 
      ? `${supabaseKey.substring(0, 30)}...${supabaseKey.substring(supabaseKey.length - 10)}` 
      : null,
    keyLength: supabaseKey?.length || 0,
    urlLength: supabaseUrl?.length || 0,
    allNextPublicVars: allEnvVars,
    message: isConfigured
      ? "✅ Variables d'environnement configurées correctement"
      : "❌ Variables d'environnement manquantes. Vérifiez Vercel → Settings → Environment Variables et redéployez.",
    instructions: !isConfigured ? [
      "1. Allez dans Vercel → Settings → Environment Variables",
      "2. Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont présentes",
      "3. Pour chaque variable, cochez Production, Preview, ET Development",
      "4. Allez dans Deployments → Cliquez sur les 3 points (⋯) → Redeploy",
      "5. Attendez la fin du build (2-5 minutes)"
    ] : [],
  }, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

