// ============================================================
// CloudPos — Login Page
// Phase 0D: Enhanced with CloudPos branding
// Auth: Supabase email/password + Google OAuth
// TODO: Add employee PIN login (requires PIN verification endpoint)
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-3">
            <span className="text-2xl font-black text-primary-foreground">C</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">CloudPos</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">{error}</p>
              )}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={signInWithGoogle}
              type="button"
            >
              Continue with Google
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by CloudPos
        </p>
      </div>
    </div>
  );
}
