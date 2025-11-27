import { NextRequest, NextResponse } from "next/server";

/**
 * Route API proxy pour charger les images Google Drive
 * Contourne les problèmes CORS et de permissions
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json(
      { error: "URL manquante" },
      { status: 400 }
    );
  }

  try {
    // Extraire l'ID Google Drive si c'est une URL Google Drive
    let finalUrl = imageUrl;
    
    if (imageUrl.includes("drive.google.com")) {
      const fileIdMatch = imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                         imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                         (imageUrl.match(/^[a-zA-Z0-9_-]{20,}$/) ? [null, imageUrl] : null);
      
      if (fileIdMatch && fileIdMatch[1]) {
        // Utiliser le format thumbnail qui fonctionne mieux
        finalUrl = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
      }
    }

    // Récupérer l'image depuis le serveur (contourne CORS)
    const imageResponse = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      // Ne pas suivre les redirections automatiquement pour Google Drive
      redirect: 'follow',
    });

    if (!imageResponse.ok) {
      // Si le format thumbnail ne fonctionne pas, essayer uc?export=view
      if (imageUrl.includes("drive.google.com")) {
        const fileIdMatch = imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                           imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                           (imageUrl.match(/^[a-zA-Z0-9_-]{20,}$/) ? [null, imageUrl] : null);
        
        if (fileIdMatch && fileIdMatch[1]) {
          const fallbackUrl = `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            redirect: 'follow',
          });

          if (fallbackResponse.ok) {
            const imageBuffer = await fallbackResponse.arrayBuffer();
            return new NextResponse(imageBuffer, {
              headers: {
                'Content-Type': fallbackResponse.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            });
          }
        }
      }

      return NextResponse.json(
        { error: "Impossible de charger l'image" },
        { status: imageResponse.status }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error("Erreur lors du chargement de l'image:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors du chargement de l'image" },
      { status: 500 }
    );
  }
}





