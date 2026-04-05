// ============================================================
// CloudPos — Login Page
// Figma spec: Screens 1/2 — employee dropdown with avatars,
// 6-digit PIN boxes + numpad, "Start Shift" CTA, blurred dashboard preview
// Email/password fallback for admin access
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { NumPad } from '@/components/pos/NumPad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Check, Loader2, Cloud, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Avatar color per employee index ── */
const AVATAR_COLORS = [
  'bg-primary', 'bg-warning', 'bg-success', 'bg-destructive',
  'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500',
];

/* ── PIN dot display ── */
function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-4 h-4 rounded-full border-2 transition-all',
            i < filled
              ? 'bg-primary border-primary scale-110'
              : 'bg-transparent border-border'
          )}
        />
      ))}
    </div>
  );
}

/* ── Employee type ── */
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  // Mode toggle
  const [mode, setMode] = useState<'pin' | 'email'>('pin');

  // PIN mode state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Email mode state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Load employees when dropdown first opens
  const openDropdown = async () => {
    if (!employeesLoaded) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, email')
          .eq('is_active', true)
          .order('first_name');
        setEmployees((data || []) as Employee[]);
        setEmployeesLoaded(true);
      } catch { setEmployees([]); setEmployeesLoaded(true); }
    }
    setDropdownOpen(v => !v);
  };

  const selectEmployee = (emp: Employee) => {
    setSelected(emp);
    setDropdownOpen(false);
    setPin('');
    setPinError('');
  };

  const handlePinKey = (digit: string) => {
    if (pin.length < 6) setPin(p => p + digit);
  };
  const handlePinDelete = () => setPin(p => p.slice(0, -1));

  const handlePinSubmit = async () => {
    if (!selected || pin.length < 4) return;
    setPinLoading(true);
    setPinError('');
    try {
      // Look up employee by pin_code (stored in profiles)
      const { data, error } = await supabase
        .from('profiles')
        .select('email, pin_code')
        .eq('id', selected.id)
        .single();

      if (error || !data) { setPinError('Could not verify PIN. Try email login.'); return; }
      if (!data.pin_code) { setPinError('No PIN set for this employee. Use email login below.'); return; }
      if (data.pin_code !== pin) { setPinError('Incorrect PIN. Please try again.'); setPin(''); return; }

      // PIN matches — sign in with email/password (PIN is employee's auth method)
      // For now, redirect to email login with pre-filled email
      // Full PIN auth requires a server-side function for security
      setPinError('PIN verified! Use email login to complete sign-in (PIN auth setup pending).');
      setMode('email');
      setEmail(selected.email);
    } catch { setPinError('Login failed. Please try again.'); }
    finally { setPinLoading(false); }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
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

  const initials = selected
    ? `${selected.first_name?.[0] || ''}${selected.last_name?.[0] || ''}`.toUpperCase()
    : null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left: Login form ── */}
      <div className="w-full pos-desktop:w-[480px] flex flex-col items-center justify-center p-8 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Cloud className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black text-foreground tracking-tight">CloudPos</span>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 w-full max-w-sm">
          <button
            onClick={() => setMode('pin')}
            className={cn('flex-1 py-1.5 text-sm font-medium rounded-md transition-all', mode === 'pin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            Employee PIN
          </button>
          <button
            onClick={() => setMode('email')}
            className={cn('flex-1 py-1.5 text-sm font-medium rounded-md transition-all', mode === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            Email Login
          </button>
        </div>

        <div className="w-full max-w-sm">
          {mode === 'pin' && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Employee</div>
                {/* Employee dropdown */}
                <div className="relative">
                  <button
                    onClick={openDropdown}
                    className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors"
                  >
                    {selected ? (
                      <>
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0', AVATAR_COLORS[employees.indexOf(selected) % AVATAR_COLORS.length])}>
                          {initials}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-foreground">{selected.first_name} {selected.last_name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{selected.role}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-sm font-bold">?</div>
                        <span className="flex-1 text-left text-sm text-muted-foreground">Select your name</span>
                      </>
                    )}
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', dropdownOpen && 'rotate-180')} />
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden max-h-60 overflow-y-auto">
                        {!employeesLoaded ? (
                          <div className="p-4 text-sm text-center text-muted-foreground">Loading...</div>
                        ) : employees.length === 0 ? (
                          <div className="p-4 text-sm text-center text-muted-foreground">No employees found. Use email login.</div>
                        ) : employees.map((emp, i) => (
                          <button
                            key={emp.id}
                            onClick={() => selectEmployee(emp)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors"
                          >
                            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0', AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                              {`${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase()}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-semibold text-foreground">{emp.first_name} {emp.last_name}</div>
                              <div className="text-xs text-muted-foreground capitalize">{emp.role}</div>
                            </div>
                            {selected?.id === emp.id && <Check className="h-4 w-4 text-primary" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selected && (
                <>
                  {/* PIN entry */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Enter PIN</div>
                    <PinDots length={6} filled={pin.length} />
                  </div>

                  {pinError && (
                    <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">{pinError}</div>
                  )}

                  <NumPad onKey={handlePinKey} onDelete={handlePinDelete} onSubmit={handlePinSubmit} />

                  <Button
                    className="w-full h-12 font-bold"
                    disabled={pin.length < 4 || pinLoading}
                    onClick={handlePinSubmit}
                  >
                    {pinLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Start Shift
                  </Button>
                </>
              )}

              <div className="text-center">
                <button onClick={() => setMode('email')} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Admin? Use email login →
                </button>
              </div>
            </div>
          )}

          {mode === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Admin / Manager Access</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@restaurant.com" required autoComplete="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password" />
              </div>
              {emailError && <p className="text-sm text-destructive" role="alert">{emailError}</p>}
              <Button className="w-full h-12 font-bold" type="submit" disabled={emailLoading}>
                {emailLoading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {emailLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => setMode('pin')} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  ← Back to Employee PIN
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Right: Blurred dashboard preview (desktop only) ── */}
      <div className="hidden pos-desktop:flex flex-1 items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-30 blur-sm scale-105 pointer-events-none select-none">
          {/* Preview cards */}
          <div className="w-full max-w-2xl p-8 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {['Total Earning', 'In Progress', 'Ready', 'Completed'].map((label, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4">
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className="text-xl font-bold text-foreground">{['$1,400', '11', '5', '8'][i]}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['In Progress (4)', 'Waiting (3)', 'Served (2)'].map((title, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-3 space-y-2">
                  <div className="text-xs font-bold text-foreground">{title}</div>
                  {[1, 2].map(j => (
                    <div key={j} className="bg-muted rounded-lg p-2.5">
                      <div className="h-2.5 bg-border rounded w-3/4 mb-1.5" />
                      <div className="h-2 bg-border rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative text-center px-8">
          <div className="text-4xl font-black text-foreground/10 mb-2">CloudPos</div>
          <div className="text-sm text-muted-foreground/60">Restaurant Point of Sale</div>
        </div>
      </div>
    </div>
  );
}
