import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Uppetit Audit',
    short_name: 'Audit',
    description: 'Система контроля и аудита точек',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#F25C05',
    orientation: 'portrait',
    icons: [
      {
        src: 'icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}