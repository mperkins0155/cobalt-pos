// ============================================================
// CloudPos — Login Page
// Figma Screens 1/2: Employee dropdown + 6-digit PIN numpad
// Fallback: email/password for admin access
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { NumPad } from '@/components/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Check, Loader2, Cloud } from 'lucide-react';
import type { Profile } from '@/types/database';

const PIN_LENGTH = 6;

// Avatar colors cycling through brand palette
const AVATAR_COLORS = [
  'bg-primary text-primary-foreground',
  'bg-warning text-warning-foreground',
  'bg-success text-white',
  'bg-destructive text-white',
  'bg-purple-500 text-white',
];

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  // Employee PIN mode
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Email/password fallback mode
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Load employees from profiles table
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, email')
          .order('first_name');
        setEmployees((data as Profile[]) || []);
      } catch {
        // fallback gracefully
      } finally {
        setLoadingEmployees(false);
      }
    })();
  }, []);

  const handlePinKey = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    setPinError('');
    if (next.length === PIN_LENGTH) {
      void attemptPinLogin(next);
    }
  };

  const handlePinDelete = () => {
    setPin((p) => p.slice(0, -1));
    setPinError('');
  };

  const attemptPinLogin = async (pinValue: string) => {
    if (!selectedEmployee) return;
    setSigningIn(true);
    setPinError('');
    try {
      // For PIN login: look up stored PIN hash in profile or attempt email+pin auth
      // Currently: use email + PIN as password (temporary until PIN endpoint is built)
      if (selectedEmployee.email) {
        await signIn(selectedEmployee.email, pinValue);
        navigate('/dashboard');
      } else {
        setPinError('Employee account not configured. Use admin login below.');
        setPin('');
      }
    } catch {
      setPinError('Incorrect PIN. Try again.');
      setPin('');
    } finally {
      setSigningIn(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError('');
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setEmailError(err.message || 'Sign in failed');
    } finally {
      setEmailLoading(false);
    }
  };

  const displayName = (p: Profile) =>
    `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Employee';

  const avatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = (p: Profile) => {
    const name = displayName(p);
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left: Login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Cloud className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black text-foreground tracking-tight">CloudPos</span>
        </div>

        {!showEmailFallback ? (
          /* ── PIN Login UI ── */
          <div className="w-full max-w-sm">
            <h1 className="text-xl font-bold text-foreground text-center mb-1">Welcome Back</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Select your profile and enter your PIN</p>

            {/* Employee dropdown */}
            <div className="relative mb-5">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors"
              >
                {selectedEmployee ? (
                  <>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                      ${avatarColor(employees.indexOf(selectedEmployee))}`}>
                      {initials(selectedEmployee)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-foreground">{displayName(selectedEmployee)}</div>
                      <div className="text-xs text-muted-foreground capitalize">{selectedEmployee.role}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-muted-foreground text-sm">?</span>
                    </div>
                    <span className="flex-1 text-left text-sm text-muted-foreground">
                      {loadingEmployees ? 'Loading...' : 'Select Employee'}
                    </span>
                  </>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-card border border-border rounded-xl shadow-pos-lg overflow-hidden">
                    {employees.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">No employees found</div>
                    ) : employees.map((emp, idx) => (
                      <button key={emp.id}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
                        onClick={() => { setSelectedEmployee(emp); setDropdownOpen(false); setPin(''); setPinError(''); }}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(idx)}`}>
                          {initials(emp)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-foreground">{displayName(emp)}</div>
                          <div className="text-xs text-muted-foreground capitalize">{emp.role}</div>
                        </div>
                        {selectedEmployee?.id === emp.id && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* PIN dots */}
            <div className="flex items-center justify-center gap-3 mb-5">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all
                  ${i < pin.length ? 'bg-primary border-primary scale-110' : 'border-border bg-transparent'}`} />
              ))}
            </div>

            {pinError && (
              <p className="text-sm text-destructive text-center mb-3">{pinError}</p>
            )}

            {/* Numpad */}
            <div className="max-w-[260px] mx-auto">
              {signingIn ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <NumPad onKey={handlePinKey} onDelete={handlePinDelete} className="gap-2" />
              )}
            </div>

            {!selectedEmployee && (
              <p className="text-xs text-center text-muted-foreground mt-4">Select an employee to start</p>
            )}

            <div className="mt-6 text-center">
              <button onClick={() => setShowEmailFallback(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                Admin login with email & password
              </button>
            </div>
          </div>
        ) : (
          /* ── Email/password fallback ── */
          <div className="w-full max-w-sm">
            <h1 className="text-xl font-bold text-foreground text-center mb-1">Admin Login</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">Sign in with your email and password</p>

            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com" required autoComplete="email" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password" className="mt-1" />
              </div>
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
              <Button className="w-full h-11" type="submit" disabled={emailLoading}>
                {emailLoading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {emailLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <button onClick={() => setShowEmailFallback(false)}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                ← Back to employee login
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Blurred dashboard preview (desktop only) ── */}
      <div className="hidden pos-desktop:flex flex-1 bg-gradient-to-br from-primary/10 via-background to-primary/5 items-center justify-center">
        <div className="text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-9 w-9 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">CloudPos</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Professional point-of-sale system for restaurants. Manage orders, tables, payments, and more.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 text-left max-w-xs mx-auto">
            {['Order Management', 'Table Floor Plan', 'Kitchen Display', 'Reporting & Analytics',
              'Customer Profiles', 'Inventory Tracking'].map((feature) => (
              <div key={feature} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
