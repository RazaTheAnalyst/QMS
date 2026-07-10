import { useState } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  InputAdornment, IconButton, Alert, CircularProgress, Stack, Chip
} from '@mui/material';
import {
  Mail, Lock, Visibility, VisibilityOff, DarkMode, LightMode,
  ShieldOutlined, RouteOutlined, CheckCircleOutline,
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

export default function LoginPage() {
  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        const message = result.error.toLowerCase().includes('invalid login credentials')
          ? 'Invalid email or password. Make sure this user exists in Supabase Authentication, then add the same email in app_users for access.'
          : result.error;
        setError(message);
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
      px: 2,
      py: 4,
    }}>
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Box sx={{ position: 'absolute', inset: 0,
          background: theme => theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, rgba(15,118,110,0.16), rgba(49,116,143,0.07) 34%, rgba(216,155,40,0.10) 100%)'
            : 'linear-gradient(135deg, rgba(34,166,154,0.18), rgba(95,169,191,0.07) 42%, rgba(212,166,72,0.10) 100%)' }} />
        <Box sx={{ position: 'absolute', left: '50%', top: '50%', width: 720, height: 720, transform: 'translate(-50%, -50%)',
          background: theme => theme.palette.mode === 'light'
            ? 'radial-gradient(circle, rgba(255,255,255,0.92), rgba(255,255,255,0.42) 38%, transparent 70%)'
            : 'radial-gradient(circle, rgba(34,166,154,0.18), rgba(23,29,27,0.20) 42%, transparent 72%)' }} />
        <Box sx={{ position: 'absolute', inset: 0, opacity: theme => theme.palette.mode === 'light' ? 0.22 : 0.12,
          backgroundImage: 'linear-gradient(rgba(15,118,110,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,0.22) 1px, transparent 1px)',
          backgroundSize: '42px 42px' }} />
      </Box>
      <IconButton
        onClick={toggleTheme}
        aria-label="Toggle theme"
        sx={{
          position: 'absolute',
          top: 18,
          right: 18,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.secondary',
          boxShadow: '0 12px 28px -24px rgba(23,32,31,0.7)',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {theme === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
      </IconButton>
      <Card sx={{
        width: '100%',
        maxWidth: 920,
        position: 'relative',
        border: '1px solid',
        borderColor: theme => theme.palette.mode === 'light' ? 'rgba(15,118,110,0.18)' : 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: theme => theme.palette.mode === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(23,29,27,0.86)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 34px 90px -54px rgba(23,32,31,0.85)',
      }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.92fr 1.08fr' },
            minHeight: { md: 540 },
          }}>
            <Box sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'space-between',
              p: 4,
              color: '#fff',
              background: 'linear-gradient(145deg, #0f766e 0%, #31748f 56%, #17201f 100%)',
            }}>
              <Box>
                <Chip
                  label="QMS Workspace"
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', fontWeight: 750 }}
                />
                <Typography variant="h4" sx={{ mt: 4, color: '#fff', maxWidth: 320 }}>
                  Freight approvals without the clutter.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1.5, color: 'rgba(255,255,255,0.76)', maxWidth: 330 }}>
                  Track quotations, compare forwarders, and keep award decisions moving from one calm workspace.
                </Typography>
              </Box>
              <Stack spacing={1.5}>
                {[
                  { icon: <RouteOutlined fontSize="small" />, text: 'Route and cargo visibility' },
                  { icon: <ShieldOutlined fontSize="small" />, text: 'Controlled approval flow' },
                  { icon: <CheckCircleOutline fontSize="small" />, text: 'Award history in one place' },
                ].map(item => (
                  <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: 'rgba(255,255,255,0.86)' }}>
                    <Box sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.icon}
                    </Box>
                    <Typography variant="body2" fontWeight={650}>{item.text}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box sx={{ p: { xs: 3, sm: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Stack alignItems="flex-start" spacing={1.25} mb={3.5}>
                <Box sx={{ width: 58, height: 58, borderRadius: 2, border: '1px solid', borderColor: 'rgba(15,118,110,0.18)',
                  bgcolor: 'rgba(15,118,110,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 12px 26px -20px rgba(15,118,110,0.9)' }}>
                  <Box component="img" src="/logo.svg" alt="Logo" sx={{ width: 38, height: 38 }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={850}>
                    Welcome back
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 360 }}>
                    Sign in to manage freight quotations and approvals.
                  </Typography>
                </Box>
              </Stack>
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2.4}>
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
                            <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </LoginField>
                  {error && <Alert severity="error">{error}</Alert>}
                  <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth sx={{
                    mt: 0.75,
                    height: 48,
                    fontWeight: 850,
                    boxShadow: '0 18px 34px -24px rgba(15,118,110,0.95)',
                  }}>
                    {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </Stack>
              </Box>
              <Typography variant="caption" display="block" color="text.secondary" mt={4}>
                Engineered by <Typography component="span" fontWeight={700} color="text.primary">Ali Raza</Typography>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
