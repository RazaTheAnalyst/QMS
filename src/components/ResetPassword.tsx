import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  InputAdornment, IconButton, Alert, CircularProgress, Stack,
} from '@mui/material';
import Lock from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBack from '@mui/icons-material/ArrowBack';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import { useAuth } from '../auth';
import { loginFieldSx } from '../lib/loginFieldSx';

export default function ResetPassword() {
  const { session, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error);
      } else {
        setDone(true);
        await signOut();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [password, confirm, updatePassword, signOut]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: theme => theme.palette.mode === 'light' ? '#eef4f1' : 'background.default',
      px: { xs: 2, sm: 3 },
      py: { xs: 3, sm: 5 },
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Box sx={{
          position: 'absolute',
          inset: 0,
          background: theme => theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, #f6faf8 0%, #eef4f1 100%)'
            : 'radial-gradient(circle at 50% 0%, rgba(34,166,154,0.12), transparent 42%)',
        }} />
      </Box>

      <Card sx={{
        width: '100%',
        maxWidth: 448,
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: theme => theme.palette.mode === 'light'
          ? '0 28px 70px -54px rgba(23,32,31,0.8)'
          : '0 28px 70px -54px rgba(0,0,0,0.95)',
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" color="primary.main" fontWeight={850} sx={{ letterSpacing: 0.4 }}>
              QMS
            </Typography>
            <Typography variant="h5" fontWeight={850} sx={{ mt: 0.25 }}>
              {done ? 'Password updated' : !session ? 'Reset link invalid' : 'Set a new password'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {done
                ? 'Your password has been changed. You can now sign in with your new password.'
                : !session
                  ? 'This password reset link is invalid or has expired. Please request a new link from the sign-in page.'
                  : 'Enter a new password for your account.'}
            </Typography>
          </Box>

          {done ? (
            <Stack spacing={2}>
              <Box sx={{ textAlign: 'center', py: 1, color: 'success.main' }}>
                <CheckCircleOutline sx={{ fontSize: 44 }} />
              </Box>
              <Button variant="contained" size="large" fullWidth onClick={() => navigate('/')}>
                Go to sign in
              </Button>
            </Stack>
          ) : !session ? (
            <Box>
              <Button component={Link} to="/" variant="outlined" size="large" fullWidth startIcon={<ArrowBack />}>
                Back to sign in
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.2}>
                <Box>
                  <Typography variant="body2" component="label" sx={{ display: 'block', mb: 0.75, fontWeight: 700, color: 'text.primary' }}>
                    New password
                  </Typography>
                  <TextField
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
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
                </Box>

                <Box>
                  <Typography variant="body2" component="label" sx={{ display: 'block', mb: 0.75, fontWeight: 700, color: 'text.primary' }}>
                    Confirm new password
                  </Typography>
                  <TextField
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    sx={loginFieldSx}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Lock fontSize="small" color="action" /></InputAdornment>,
                    }}
                    fullWidth
                  />
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

                <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth sx={{
                  mt: 0.5,
                  height: 48,
                  fontWeight: 850,
                  borderRadius: 1.5,
                  boxShadow: '0 18px 34px -24px rgba(15,118,110,0.95)',
                }}>
                  {submitting ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                  {submitting ? 'Updating...' : 'Update password'}
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}