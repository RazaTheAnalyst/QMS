import { useState } from 'react';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import { loginFieldSx } from '@/lib/loginFieldSx';
import {
  Box, Typography, TextField, Button,
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
import LocalShipping from '@mui/icons-material/LocalShipping';
import CompareArrows from '@mui/icons-material/CompareArrows';
import Speed from '@mui/icons-material/Speed';

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

const features = [
  { icon: <LocalShipping sx={{ fontSize: 20 }} />, title: 'Freight Management', desc: 'Track and manage quotations across all entities' },
  { icon: <CompareArrows sx={{ fontSize: 20 }} />, title: 'Rate Comparison', desc: 'Compare forwarder rates in multiple currencies' },
  { icon: <Speed sx={{ fontSize: 20 }} />, title: 'Fast Approvals', desc: 'Streamlined approval workflow with instant alerts' },
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
      bgcolor: 'background.default',
    }}>
      {/* Left panel - branding */}
      <Box sx={{
        flex: 1,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'primary.main',
        position: 'relative',
        overflow: 'hidden',
        px: 6,
      }}>
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 420, textAlign: 'center' }}>
          <Box sx={{
            width: 72,
            height: 72,
            borderRadius: 2.5,
            bgcolor: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 4,
          }}>
            <Box component="img" src="/logo.svg" alt="QMS" sx={{ width: 44, height: 44, filter: 'brightness(0) invert(1)' }} />
          </Box>

          <Typography variant="h3" fontWeight={800} color="#ffffff" sx={{ mb: 1.5, letterSpacing: '-0.02em' }}>
            QMS
          </Typography>
          <Typography variant="h6" fontWeight={600} color="rgba(255,255,255,0.85)" sx={{ mb: 5 }}>
            Quotation Management System
          </Typography>

          <Stack spacing={3} sx={{ textAlign: 'left' }}>
            {features.map((f) => (
              <Box key={f.title} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                }}>
                  {f.icon}
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={700} color="#ffffff">
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mt: 0.25 }}>
                    {f.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        <Typography variant="caption" color="rgba(255,255,255,0.5)" sx={{ position: 'absolute', bottom: 3, left: 0, right: 0, textAlign: 'center' }}>
          Engineered by Ali Raza
        </Typography>
      </Box>

      {/* Right panel - login form */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        px: { xs: 3, sm: 4, md: 6 },
        py: 4,
        position: 'relative',
      }}>
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <Tooltip title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <IconButton onClick={toggleTheme} size="small" sx={{ color: 'text.secondary' }} aria-label="Toggle theme">
              {theme === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Box component="img" src="/logo.svg" alt="QMS" sx={{ width: 24, height: 24, filter: 'brightness(0) invert(1)' }} />
            </Box>
            <Typography fontWeight={800} fontSize="1.1rem">QMS</Typography>
          </Box>

          <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
            Sign in to manage freight quotations and approvals.
          </Typography>

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

              {error && <Alert severity="error" sx={{ borderRadius: 1 }}>{error}</Alert>}

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
                fontWeight: 700,
                borderRadius: 1.5,
                boxShadow: '0 4px 14px -4px rgba(15,118,110,0.5)',
                '&:hover': { boxShadow: '0 6px 20px -4px rgba(15,118,110,0.6)' },
              }}>
                {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" display="block" color="text.secondary" mt={4} textAlign="center">
            Engineered by <Typography component="span" fontWeight={800} color="text.primary">Ali Raza</Typography>
          </Typography>
        </Box>
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
            <Alert severity="success" sx={{ borderRadius: 1 }}>
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
                {resetError && <Alert severity="error" sx={{ borderRadius: 1 }}>{resetError}</Alert>}
                <Button type="submit" variant="contained" size="large" disabled={resetLoading} fullWidth sx={{ height: 46, fontWeight: 700, borderRadius: 1.5 }}>
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
