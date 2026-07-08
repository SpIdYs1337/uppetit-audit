// app/layout.tsx
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
    title: "UPPETIT",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-512x512.png", 
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="bg-[#F5F6F8] dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-300 min-h-[100dvh]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>  
  );
}