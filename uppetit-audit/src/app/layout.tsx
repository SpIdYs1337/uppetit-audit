import type { Metadata, Viewport } from "next";
import "./globals.css";
import UpdateChecker from "@/components/UpdateChecker"; // <-- 1. ДОБАВИЛИ ИМПОРТ

export const metadata: Metadata = {
  title: "UPPETIT Audit",
  description: "Система контроля качества",
};

export const viewport: Viewport = {
  themeColor: "#F5F6F8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Это заставляет приложение занять весь экран
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
        
        {/* 2. ВСТАВИЛИ КОМПОНЕНТ ПРОВЕРКИ ОБНОВЛЕНИЙ */}
        <UpdateChecker />
        
      </body>
    </html>
  );
}