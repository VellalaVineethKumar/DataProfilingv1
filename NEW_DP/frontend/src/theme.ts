// frontend/src/theme.ts
import { createTheme, type Theme } from '@mui/material';

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const light = mode === 'light';
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#b60003',
        dark: '#8f0002',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#6b7280',
        contrastText: '#ffffff',
      },
      background: {
        default: light ? '#f8f9fa' : '#0f1117',
        paper: light ? '#ffffff' : '#1a1d23',
      },
      divider: light ? '#e5e7eb' : '#2d3139',
      text: {
        primary: light ? '#111827' : '#f9fafb',
        secondary: light ? '#6b7280' : '#9ca3af',
      },
      success: { main: '#16a34a' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      info: { main: '#0ea5e9' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeightMedium: 500,
      fontWeightBold: 700,
      body1: { fontSize: '0.875rem' },
      body2: { fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem' },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${light ? '#e5e7eb' : '#2d3139'}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          outlined: {
            borderColor: light ? '#e5e7eb' : '#2d3139',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              fontWeight: 600,
              backgroundColor: light ? '#f1f5f9' : '#22262e',
            },
          },
        },
      },
    },
  });
}
