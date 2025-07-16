'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getTheme } from '@/theme'
import { PaletteMode } from '@mui/material'

interface ThemeContextType {
  mode: PaletteMode
  toggleColorMode: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>('light')

  useEffect(() => {
    // Check for saved theme preference
    const savedMode = localStorage.getItem('theme-mode') as PaletteMode
    if (savedMode) {
      setMode(savedMode)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark')
    }
  }, [])

  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light'
    setMode(newMode)
    localStorage.setItem('theme-mode', newMode)
  }

  const theme = getTheme(mode)

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
} 