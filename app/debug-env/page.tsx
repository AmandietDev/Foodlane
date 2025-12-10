"use client";

export default function DebugEnvPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug - Variables d'environnement</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">NEXT_PUBLIC_SUPABASE_URL</h2>
          <p className="text-sm break-all">
            {supabaseUrl ? (
              <>
                <span className="text-green-600">✅ Présent</span>
                <br />
                <code className="mt-2 block">{supabaseUrl}</code>
              </>
            ) : (
              <span className="text-red-600">❌ Manquant</span>
            )}
          </p>
        </div>

        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">NEXT_PUBLIC_SUPABASE_ANON_KEY</h2>
          <p className="text-sm break-all">
            {supabaseKey ? (
              <>
                <span className="text-green-600">✅ Présent</span>
                <br />
                <code className="mt-2 block">
                  {supabaseKey.substring(0, 50)}...{supabaseKey.substring(supabaseKey.length - 10)}
                </code>
                <p className="text-xs text-gray-600 mt-2">Longueur: {supabaseKey.length} caractères</p>
              </>
            ) : (
              <span className="text-red-600">❌ Manquant</span>
            )}
          </p>
        </div>

        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Statut</h2>
          <p className={supabaseUrl && supabaseKey ? "text-green-600" : "text-red-600"}>
            {supabaseUrl && supabaseKey
              ? "✅ Configuration complète"
              : "❌ Configuration incomplète"}
          </p>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h2 className="font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Vérifiez que les variables sont bien configurées dans Vercel → Settings → Environment Variables</li>
            <li>Vérifiez que vous avez coché <strong>Production</strong>, <strong>Preview</strong>, et <strong>Development</strong></li>
            <li>Redéployez votre application après avoir ajouté les variables</li>
            <li>Si les variables sont toujours manquantes, vérifiez les logs de build dans Vercel</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

