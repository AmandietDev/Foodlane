/**
 * Extrait l'ID d'un fichier Google Drive depuis différentes URL
 */
function extractGoogleDriveId(url: string): string | null {
  // Format 1: https://drive.google.com/file/d/FILE_ID/view
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Format 2: https://drive.google.com/open?id=FILE_ID
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Format 3: ID seul (format court)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Convertit une URL Google Drive en URL d'image accessible
 * Utilise le proxy API pour contourner les problèmes CORS
 */
export function getImageUrl(raw?: string): string | null {
  if (!raw || !raw.trim()) return null;

  const url = raw.trim();

  // Si c'est déjà une URL complète valide (http/https) et pas Google Drive, on la retourne
  if ((url.startsWith("http://") || url.startsWith("https://")) && !url.includes("drive.google.com")) {
    return url;
  }

  // Extraire l'ID Google Drive
  const fileId = extractGoogleDriveId(url);
  if (!fileId) {
    // Si on ne peut pas extraire l'ID et que c'est une URL valide, on la retourne
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return null;
  }

  // Utiliser le proxy API pour les images Google Drive
  // Cela contourne les problèmes CORS et de permissions
  return `/api/images?url=${encodeURIComponent(url)}`;
}

/**
 * Génère plusieurs URLs alternatives pour une image Google Drive
 * Utile pour essayer différents formats si le premier échoue
 */
export function getImageUrlAlternatives(raw?: string): string[] {
  if (!raw || !raw.trim()) return [];

  const url = raw.trim();
  const fileId = extractGoogleDriveId(url);
  
  if (!fileId) {
    return [];
  }

  // Différents formats à essayer
  return [
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
  ];
}



