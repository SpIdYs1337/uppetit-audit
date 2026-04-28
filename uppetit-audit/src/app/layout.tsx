import type { Metadata, Viewport } from "next";
import "./globals.css";
import UpdateChecker from "@/components/UpdateChecker";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "UPPETIT Audit",
  description: "Система контроля качества",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UPPETIT Audit", 
  },
  formatDetection: {
    telephone: false,
  },
  // --- ДОБАВЛЯЕМ СПЕЦИАЛЬНО ДЛЯ APPLE ---
  icons: {
    apple: [
      { url: "/icon-192x192.png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F6F8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {/* ОБЕРНУЛИ ВСЁ В PROVIDERS */}
        <Providers>
          {children}
        </Providers>
        
        <UpdateChecker />
      </body>
    </html>
  );
}