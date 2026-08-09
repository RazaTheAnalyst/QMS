import { useState } from 'react';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import { loginFieldSx } from '@/lib/loginFieldSx';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  InputAdornment, IconButton, Alert, CircularProgress, Stack, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import Mail from '@mui/icons-material/Mail';
import Lock from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import Key from '@mui/icons-material/Key';
import CloseIcon from '@mui/icons-material/Close';

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

function FreightIllustration() {
  return (
    <Box sx={{ width: '100%', height: 140, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pb: 2, pt: 1.5, borderRadius: '16px 16px 0 0', bgcolor: theme => theme.palette.mode === 'light' ? 'rgba(15,118,110,0.06)' : 'rgba(34,166,154,0.08)', position: 'relative', overflow: 'hidden' }}>
      <svg viewBox="0 0 400 120" width="340" height="110" xmlns="http://www.w3.org/2000/svg">
        {/* Water */}
        <path d="M0 95 Q50 88 100 95 Q150 102 200 95 Q250 88 300 95 Q350 102 400 95 L400 120 L0 120 Z" fill="rgba(49,116,143,0.15)" />
        <path d="M0 102 Q60 96 120 102 Q180 108 240 102 Q300 96 360 102 L400 102 L400 120 L0 120 Z" fill="rgba(49,116,143,0.08)" />

        {/* Ship hull */}
        <path d="M60 88 L80 68 L320 68 L340 88 Q280 100 200 100 Q120 100 60 88 Z" fill="rgba(15,118,110,0.7)" />
        <path d="M80 68 L320 68 L320 74 L80 74 Z" fill="rgba(15,118,110,0.85)" />

        {/* Containers row 1 */}
        <rect x="100" y="42" width="32" height="26" rx="2" fill="#0f766e" opacity="0.9" />
        <rect x="136" y="42" width="32" height="26" rx="2" fill="#31748f" opacity="0.85" />
        <rect x="172" y="42" width="32" height="26" rx="2" fill="#0f766e" opacity="0.95" />
        <rect x="208" y="42" width="32" height="26" rx="2" fill="#31748f" opacity="0.8" />
        <rect x="244" y="42" width="32" height="26" rx="2" fill="#0f766e" opacity="0.9" />
        <rect x="280" y="42" width="32" height="26" rx="2" fill="#31748f" opacity="0.85" />

        {/* Containers row 2 */}
        <rect x="118" y="22" width="32" height="20" rx="2" fill="#31748f" opacity="0.75" />
        <rect x="154" y="22" width="32" height="20" rx="2" fill="#0f766e" opacity="0.85" />
        <rect x="190" y="22" width="32" height="20" rx="2" fill="#31748f" opacity="0.8" />
        <rect x="226" y="22" width="32" height="20" rx="2" fill="#0f766e" opacity="0.75" />
        <rect x="262" y="22" width="32" height="20" rx="2" fill="#31748f" opacity="0.9" />

        {/* Crane */}
        <rect x="330" y="10" width="6" height="58" rx="2" fill="rgba(15,118,110,0.6)" />
        <rect x="310" y="8" width="50" height="5" rx="2" fill="rgba(15,118,110,0.5)" />
        <line x1="315" y1="13" x2="315" y2="30" stroke="rgba(15,118,110,0.3)" strokeWidth="1.5" />
        <line x1="325" y1="13" x2="325" y2="26" stroke="rgba(15,118,110,0.3)" strokeWidth="1.5" />
        <line x1="335" y1="13" x2="335" y2="22" stroke="rgba(15,118,110,0.3)" strokeWidth="1.5" />

        {/* Ship deck detail */}
        <rect x="90" y="66" width="20" height="8" rx="1" fill="rgba(255,255,255,0.15)" />
        <rect x="310" y="66" width="20" height="8" rx="1" fill="rgba(255,255,255,0.15)" />

        {/* Small waves */}
        <path d="M0 98 Q20 94 40 98 Q60 102 80 98" stroke="rgba(49,116,143,0.2)" strokeWidth="1.5" fill="none" />
        <path d="M320 98 Q340 94 360 98 Q380 102 400 98" stroke="rgba(49,116,143,0.2)" strokeWidth="1.5" fill="none" />
      </svg>
    </Box>
  );
}

const features = [
  { icon: '📦', text: 'Track quotations in real-time' },
  { icon: '💱', text: 'Compare freight rates across currencies' },
  { icon: '⚡', text: 'Streamline approvals with instant alerts' },
];

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState(email);
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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

  const openForgot = () => {
    setResetEmail(email);
    setResetError('');
    setResetSent(false);
    setForgotOpen(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      const result = await resetPassword(resetEmail.trim());
      if (result.error) {
        setResetError(result.error);
      } else {
        setResetSent(true);
      }
    } catch {
      setResetError('An unexpected error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
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
            ? 'radial-gradient(ellipse at 50% 0%, rgba(15,118,110,0.08) 0%, transparent 60%)'
            : 'radial-gradient(circle at 50% 0%, rgba(34,166,154,0.12), transparent 42%)',
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
        <FreightIllustration />

        <CardContent sx={{ p: { xs: 3, sm: 4 }, pt: { xs: 2.5, sm: 3 } }}>
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

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1.2 }}>
                <Button
                  onClick={openForgot}
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 650, color: 'primary.main', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
                >
                  Forgot password?
                </Button>
              </Box>

              <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth sx={{
                mt: 0.5,
                height: 48,
                fontWeight: 800,
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

      <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 3 }, mt: 4, maxWidth: 520, justifyContent: 'center', flexWrap: 'wrap' }}>
        {features.map((f) => (
          <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography fontSize={16}>{f.icon}</Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={550} whiteSpace="nowrap">
              {f.text}
            </Typography>
          </Box>
        ))}
      </Box>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Key sx={{ fontSize: 20, color: 'primary.main' }} />
            Reset password
          </Box>
          <IconButton size="small" onClick={() => setForgotOpen(false)} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {resetSent ? (
            <Alert severity="success" sx={{ borderRadius: 1.5 }}>
              If an account exists for <strong>{resetEmail.trim()}</strong>, a password reset link has been sent. Check your inbox.
            </Alert>
          ) : (
            <Box component="form" onSubmit={handleResetSubmit}>
              <Stack spacing={2.2} sx={{ mt: 0.5 }}>
                <Box>
                  <Typography variant="body2" component="label" sx={{ display: 'block', mb: 0.75, fontWeight: 700, color: 'text.primary' }}>
                    Email
                  </Typography>
                  <TextField
                    type="email"
                    placeholder="you@company.com"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    autoFocus
                    sx={loginFieldSx}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Mail fontSize="small" color="action" /></InputAdornment>,
                    }}
                    fullWidth
                  />
                </Box>
                {resetError && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{resetError}</Alert>}
                <Button type="submit" variant="contained" size="large" disabled={resetLoading} fullWidth sx={{ height: 46, fontWeight: 800, borderRadius: 1.5 }}>
                  {resetLoading && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
                  {resetLoading ? 'Sending...' : 'Send reset link'}
                </Button>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setForgotOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
