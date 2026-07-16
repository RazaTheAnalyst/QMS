import { useState } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  InputAdornment, IconButton, Alert, CircularProgress, Stack, Tooltip
} from '@mui/material';
import {
  Mail, Lock, Visibility, VisibilityOff, DarkMode, LightMode,
} from '@mui/icons-material';

const loginFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    minHeight: 48,
    bgcolor: theme => theme.palette.mode === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(23,29,27,0.82)',
    borderRadius: 1.5,
    '& fieldset': {
      borderColor: theme => theme.palette.mode === 'light' ? 'rgba(15,118,110,0.18)' : 'rgba(34,166,154,0.22)',
    },
    '&:hover fieldset': {
      borderColor: 'primary.main',
    },
    '&.Mui-focused fieldset': {
      borderWidth: 1,
      borderColor: 'primary.main',
      boxShadow: theme => theme.palette.mode === 'light'
        ? '0 0 0 3px rgba(15,118,110,0.10)'
        : '0 0 0 3px rgba(34,166,154,0.14)',
    },
  },
  '& input': {
    fontWeight: 650,
    letterSpacing: 0,
    color: theme => theme.palette.mode === 'light' ? 'rgba(0,0,0,0.87)' : 'rgba(255,255,255,0.87)',
  },
  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
    WebkitTextFillColor: 'currentColor',
    caretColor: 'currentColor',
    WebkitBoxShadow: theme => `0 0 0 1000px ${theme.palette.mode === 'light' ? '#ffffff' : '#171d1b'} inset !important`,
    boxShadow: theme => `0 0 0 1000px ${theme.palette.mode === 'light' ? '#ffffff' : '#171d1b'} inset !important`,
    transition: 'background-color 9999s ease-out 0s',
  },
};

function LoginField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography
        variant="body2"
        component="label"
        sx={{ display: 'block', mb: 0.75, fontWeight: 700, color: 'text.primary' }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

export default function LoginPage() {
  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Please try again in ${remaining}s.`);
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
          setAttempts(0);
          setError('Too many failed attempts. Please try again in 60 seconds.');
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          const message = result.error.toLowerCase().includes('invalid login credentials')
            ? `Invalid email or password. ${remaining > 0 ? `${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` : ''}`
            : result.error;
          setError(message);
        }
      } else {
        setAttempts(0);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: theme => theme.palette.mode === 'light' ? '#eef4f1' : 'background.default',
      position: 'relative',
      overflow: 'hidden',
      px: { xs: 2, sm: 3 },
      py: { xs: 3, sm: 5 },
    }}>
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Box sx={{
          position: 'absolute',
          inset: 0,
          background: theme => theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, #f6faf8 0%, #eef4f1 100%)'
            : 'radial-gradient(circle at 50% 0%, rgba(34,166,154,0.12), transparent 42%)',
        }} />
        <Box sx={{
          position: 'absolute',
          inset: 0,
          opacity: theme => theme.palette.mode === 'light' ? 0.18 : 0.08,
          backgroundImage: 'linear-gradient(rgba(15,118,110,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,0.16) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }} />
      </Box>

      <Card sx={{
        width: '100%',
        maxWidth: 448,
        position: 'relative',
        border: '1px solid',
        borderColor: theme => theme.palette.mode === 'light' ? 'rgba(15,118,110,0.18)' : 'divider',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: theme => theme.palette.mode === 'light'
          ? '0 28px 70px -54px rgba(23,32,31,0.8)'
          : '0 28px 70px -54px rgba(0,0,0,0.95)',
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3 }}>
            <Box sx={{
              width: 52,
              height: 52,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'rgba(15,118,110,0.18)',
              bgcolor: theme => theme.palette.mode === 'light' ? 'rgba(15,118,110,0.07)' : 'rgba(34,166,154,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 26px -22px rgba(15,118,110,0.9)',
            }}>
              <Box component="img" src="/logo.svg" alt="QMS logo" sx={{ width: 34, height: 34 }} />
            </Box>

            <Tooltip title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              <IconButton
                onClick={toggleTheme}
                aria-label="Toggle theme"
                size="small"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                  color: 'text.secondary',
                  borderRadius: 1.25,
                  '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
                }}
              >
                {theme === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ mb: 3.25 }}>
            <Typography variant="overline" color="primary.main" fontWeight={850} sx={{ letterSpacing: 0.4 }}>
              QMS
            </Typography>
            <Typography variant="h5" fontWeight={850} sx={{ mt: 0.25 }}>
              Quotation Manager
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 340 }}>
              Sign in to manage freight quotations and approvals.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.2}>
              <LoginField label="Email">
                <TextField
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  sx={loginFieldSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Mail fontSize="small" color="action" /></InputAdornment>,
                  }}
                  fullWidth
                />
              </LoginField>

              <LoginField label="Password">
                <TextField
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  sx={loginFieldSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Lock fontSize="small" color="action" /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                />
              </LoginField>

              {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

              <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth sx={{
                mt: 0.5,
                height: 48,
                fontWeight: 850,
                borderRadius: 1.5,
                boxShadow: '0 18px 34px -24px rgba(15,118,110,0.95)',
              }}>
                {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" display="block" color="text.secondary" mt={3.5} textAlign="center">
            Engineered by <Typography component="span" fontWeight={800} color="text.primary">Ali Raza</Typography>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
