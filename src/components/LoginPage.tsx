import { useState } from 'react';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  InputAdornment, IconButton, Alert, CircularProgress, Stack
} from '@mui/material';
import { Mail, Lock, Visibility, VisibilityOff, DarkMode, LightMode } from '@mui/icons-material';

const loginFieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 46,
    bgcolor: 'background.paper',
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
      if (result.error) setError(result.error);
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
      bgcolor: 'background.default',
      position: 'relative',
      overflow: 'hidden',
      px: 2,
      py: 4,
    }}>
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, height: 280,
          background: theme => theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, rgba(15,118,110,0.14), rgba(49,116,143,0.06) 52%, transparent)'
            : 'linear-gradient(180deg, rgba(34,166,154,0.18), rgba(95,169,191,0.08) 52%, transparent)' }} />
        <Box sx={{ position: 'absolute', inset: 0,
          background: theme => theme.palette.mode === 'light'
            ? 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.9), transparent 44%)'
            : 'radial-gradient(circle at 50% 0%, rgba(34,166,154,0.18), transparent 44%)' }} />
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
        maxWidth: 430,
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        boxShadow: '0 28px 80px -48px rgba(23,32,31,0.55)',
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack alignItems="center" spacing={1.25} mb={3}>
            <Box sx={{ width: 62, height: 62, borderRadius: 2, border: '1px solid', borderColor: 'rgba(15,118,110,0.18)',
              bgcolor: 'rgba(15,118,110,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 26px -20px rgba(15,118,110,0.9)' }}>
              <Box component="img" src="/logo.svg" alt="Logo" sx={{ width: 40, height: 40 }} />
            </Box>
            <Typography variant="h5" textAlign="center" fontWeight={800}>
              Quotation Manager
            </Typography>
            <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ maxWidth: 300 }}>
              Sign in to manage freight quotations and approvals.
            </Typography>
          </Stack>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
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
              <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth sx={{ mt: 0.5, height: 46 }}>
                {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
          <Typography variant="caption" display="block" textAlign="center" color="text.secondary" mt={4}>
            Engineered by <Typography component="span" fontWeight={600} color="text.primary">Ali Raza</Typography>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
