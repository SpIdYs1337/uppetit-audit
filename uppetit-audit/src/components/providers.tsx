'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { SessionGuard } from './SessionGuard';
import { ThemePreferences } from './ThemePreferences';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider storageKey="uppetit:theme:display" attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ThemePreferences><SessionGuard>{children}</SessionGuard></ThemePreferences>
      </ThemeProvider>
    </SessionProvider>
  );
}
