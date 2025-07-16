import { createTheme, alpha, CSSObject } from '@mui/material/styles'
import { PaletteMode } from '@mui/material'
import { Theme } from '@mui/material/styles';

const sfPro = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
}

const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#0071e3' : '#0a84ff',
      light: mode === 'light' ? '#147ce5' : '#409cff',
      dark: mode === 'light' ? '#0051a2' : '#0060c7',
      contrastText: '#ffffff',
    },
    secondary: {
      main: mode === 'light' ? '#6e6e73' : '#86868b',
      light: mode === 'light' ? '#8e8e93' : '#98989d',
      dark: mode === 'light' ? '#4e4e53' : '#6e6e73',
    },
    background: {
      default: mode === 'light' ? '#f5f5f7' : '#000000',
      paper: mode === 'light' ? '#ffffff' : '#1c1c1e',
      subtle: mode === 'light' ? '#fbfbfd' : '#2c2c2e',
    },
    text: {
      primary: mode === 'light' ? '#1d1d1f' : '#f5f5f7',
      secondary: mode === 'light' ? '#6e6e73' : '#86868b',
    },
    divider: mode === 'light' ? '#d2d2d7' : '#38383a',
    error: {
      main: '#ff3b30',
    },
    success: {
      main: '#34c759',
    },
    warning: {
      main: '#ff9f0a',
    },
    info: {
      main: '#5856d6',
    },
  },
  typography: {
    fontFamily: sfPro.fontFamily,
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.015em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '1rem',
      letterSpacing: '-0.005em',
    },
    body2: {
      fontSize: '0.875rem',
      letterSpacing: '-0.005em',
    },
    button: {
      textTransform: 'none' as const,
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 500,
          textTransform: 'none',
          '&.MuiButton-contained': {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        } as CSSObject,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          borderRadius: 12,
          border: `1px solid ${theme.palette.divider}`,
          background: theme.palette.background.paper,
          boxShadow: theme.palette.mode === 'light'
            ? '0 2px 12px rgba(0, 0, 0, 0.08)'
            : '0 2px 12px rgba(0, 0, 0, 0.3)',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.paper,
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          backgroundColor: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }: { theme: Theme }) => ({
          backgroundColor: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: 'blur(20px)',
          border: 'none',
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          borderColor: theme.palette.divider,
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
})

export const getTheme = (mode: PaletteMode) => createTheme(getDesignTokens(mode))

export default getTheme('light') 