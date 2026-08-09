import { createTheme } from '@mui/material/styles';

const lightPalette = {
  mode: 'light' as const,
  primary: { main: '#0f766e', light: '#278e83', dark: '#0c625c', contrastText: '#ffffff' },
  secondary: { main: '#b7791f', light: '#d89b28', dark: '#945f18', contrastText: '#fffaf0' },
  success: { main: '#168256', light: '#1fa06d', dark: '#0d6b45', contrastText: '#ffffff' },
  warning: { main: '#d89b28', light: '#e3ab3d', dark: '#b7791f', contrastText: '#1f1605' },
  info: { main: '#31748f', light: '#4a8ba8', dark: '#255e75', contrastText: '#ffffff' },
  error: { main: '#c2412d', light: '#d9533f', dark: '#a03624', contrastText: '#ffffff' },
  purple: { main: '#7c3aed', light: '#a78bfa', dark: '#6d28d9', contrastText: '#ffffff' },
  indigo: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#ffffff' },
  background: { default: '#f7f8f5', paper: '#ffffff' },
  text: { primary: '#17201f', secondary: '#66736f' },
  divider: '#d9ded7',
};

const darkPalette = {
  mode: 'dark' as const,
  primary: { main: '#22a69a', light: '#3dc0b3', dark: '#1a8a80', contrastText: '#ffffff' },
  secondary: { main: '#d4a648', light: '#e0b85e', dark: '#b88e32', contrastText: '#171006' },
  success: { main: '#4fb982', light: '#66cc99', dark: '#3a9e6e', contrastText: '#ffffff' },
  warning: { main: '#d4a648', light: '#e0b85e', dark: '#b88e32', contrastText: '#171006' },
  info: { main: '#5fa9bf', light: '#7bbdd1', dark: '#4a8fa7', contrastText: '#ffffff' },
  error: { main: '#ef6a50', light: '#f5846e', dark: '#d9533c', contrastText: '#ffffff' },
  purple: { main: '#a78bfa', light: '#c4b5fd', dark: '#7c3aed', contrastText: '#ffffff' },
  indigo: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1', contrastText: '#ffffff' },
  background: { default: '#111614', paper: '#171d1b' },
  text: { primary: '#eef4f0', secondary: '#a9b7b2' },
  divider: '#2c3632',
};

const elevationShadows = {
  low: '0 1px 2px rgba(23,32,31,0.04), 0 4px 12px -8px rgba(23,32,31,0.15)',
  medium: '0 2px 4px rgba(23,32,31,0.04), 0 10px 24px -18px rgba(23,32,31,0.22)',
  high: '0 4px 8px rgba(23,32,31,0.04), 0 18px 40px -20px rgba(23,32,31,0.35)',
};

export const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: mode === 'light' ? lightPalette : darkPalette,
  typography: {
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase' },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          lineHeight: 1.5,
        },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          background: mode === 'light' ? '#d9ded7' : '#3a4a45',
          borderRadius: 3,
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: mode === 'light' ? '#d9ded7 transparent' : '#3a4a45 transparent',
        },
        '::selection': {
          background: mode === 'light' ? '#0f766e' : '#22a69a',
          color: '#ffffff',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 },
        sizeSmall: { fontSize: '0.8125rem', height: 32 },
        sizeMedium: { fontSize: '0.875rem', height: 40 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: elevationShadows.medium,
          borderRadius: 8,
          transition: 'box-shadow 0.3s, transform 0.2s',
          '&:hover': {
            boxShadow: elevationShadows.high,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 8 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.75rem' },
        sizeSmall: { height: 24 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { padding: '10px 16px', fontSize: '0.8125rem' },
        head: { fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase' },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 8 },
      },
    },
  },
});

export { elevationShadows };
