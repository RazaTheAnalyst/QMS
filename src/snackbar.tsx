import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert, type AlertColor } from '@mui/material';

interface SnackbarContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType>({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');

  const show = useCallback((msg: string, sev: AlertColor) => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  const success = useCallback((msg: string) => show(msg, 'success'), [show]);
  const error = useCallback((msg: string) => show(msg, 'error'), [show]);
  const warning = useCallback((msg: string) => show(msg, 'warning'), [show]);
  const info = useCallback((msg: string) => show(msg, 'info'), [show]);

  return (
    <SnackbarContext.Provider value={{ success, error, warning, info }}>
      {children}
      <Snackbar open={open} autoHideDuration={4000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbar() {
  return useContext(SnackbarContext);
}
