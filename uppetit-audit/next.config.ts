import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
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