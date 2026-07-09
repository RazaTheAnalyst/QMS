/* eslint-disable react-refresh/only-export-components */
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import type { ReactElement, ReactNode } from 'react';
import { getTheme } from '../mui-theme';

function Providers({ children }: { children: ReactNode }) {
  return (
    <MuiThemeProvider theme={getTheme('light')}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Providers, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
