'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { SessionGuard } from './SessionGuard';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SessionGuard>{children}</SessionGuard>
      </ThemeProvider>
    </SessionProvider>
  );
}
