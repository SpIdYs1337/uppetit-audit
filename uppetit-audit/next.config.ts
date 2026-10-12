import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    // Cache only public static assets; private API, HTML and RSC responses
    // must never enter CacheStorage, including same-URL cross-user responses.
    runtimeCaching: [
      { urlPattern: ({ url, request }) => url.pathname.startsWith('/api/') || request.mode === 'navigate' || request.headers.get('RSC') === '1', handler: 'NetworkOnly' },
      { urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith('/_next/static/') || /\.(?:png|jpg|svg|woff2?)$/.test(url.pathname)), handler: 'CacheFirst', options: { cacheName: 'uppetit-public-v2', expiration: { maxEntries: 64, maxAgeSeconds: 604800 } } },
    ],
  },
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.18.0.1'],
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
    ] }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.storage.beget.cloud', 
      },
      // Если у тебя есть прямой домен (без поддоменов), раскомментируй строку ниже:
      // { protocol: 'https', hostname: 'storage.beget.cloud' }
    ],
  },
};

export default withPWA(nextConfig);
