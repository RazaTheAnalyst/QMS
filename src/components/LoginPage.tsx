import { useState } from 'react';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Mail, Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div
      className="flex items-center justify-center min-h-screen relative overflow-hidden transition-colors duration-300"
      style={{ background: 'var(--login-page-bg)' }}
    >
      {/* Floating Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm border shadow-lg hover:bg-card"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* Floating Orbs Background */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md mx-4 border-border/50 bg-card/95 backdrop-blur-sm shadow-2xl relative z-10">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <img src="/logo.svg" alt="Logo" className="w-16 h-16 mx-auto mb-2 drop-shadow-md" />
          </div>

          <h1 className="text-2xl font-bold text-center text-foreground">Quotation Manager</h1>
          <p className="text-sm text-center text-muted-foreground mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm flex items-center gap-2">
                  <span className="text-destructive font-medium">!</span>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className={cn("w-full h-11 text-sm font-semibold", loading && "opacity-70 cursor-not-allowed")}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            Engineered by{' '}
            <span className="font-semibold text-foreground">Ali Raza</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
