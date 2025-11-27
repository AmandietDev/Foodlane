import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
    // Permettre toutes les images pour le proxy API
    unoptimized: false,
    // Formats modernes pour de meilleures performances
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
