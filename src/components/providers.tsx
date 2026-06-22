'use client'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'
import { I18nProvider } from '@/lib/i18n'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider>
        <Toaster />
        {children}
      </I18nProvider>
    </ThemeProvider>
  )
}
