'use client'

import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthProvider } from '@/components/AuthProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
          {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
