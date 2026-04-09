// ============================================================
// CloudPos — Settings Page
// Screens 60/63/65: Employee profile modal with sidebar tabs
// Employee Info / Security (Change PIN) / Display (Dark mode)
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { NumPad } from '@/components/pos';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, Users, Shield, Monitor,
  CalendarDays, Grid3X3, Truck, ShoppingBag, FileText,
  Wallet, ChevronRight, Sun, Moon, Laptop, Check,
  User, Phone, Mail, MapPin, Briefcase, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

type SettingsTab = 'employee' | 'security' | 'display';

const NAV_ITEMS = [
  { icon: Users,       label: 'Staff',        path: '/staff' },
  { icon: CalendarDays, label: 'Reservations', path: '/reservations' },
  { icon: Grid3X3,     label: 'Table Floor',  path: '/table-floor' },
  { icon: Truck,       label: 'Suppliers',    path: '/suppliers' },
  { icon: ShoppingBag, label: 'Purchasing',   path: '/purchasing' },
  { icon: FileText,    label: 'Quotations',   path: '/quotations' },
  { icon: Wallet,      label: 'Expenses',     path: '/expenses' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { organization, profile } = useAuth();
  const [employeeOpen, setEmployeeOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Settings</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{organization?.name || 'Organization'}</p>

      {/* Employee profile card — prominent, at top */}
      <div
        className="bg-card rounded-xl border border-border p-4 flex items-center gap-4 mb-5 cursor-pointer hover:border-primary/40 hover:shadow-pos transition-all"
        onClick={() => setEmployeeOpen(true)}
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-primary">
            {(profile?.first_name || 'U').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Employee'}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{profile?.role || 'Staff'} · {profile?.email || ''}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>

      {/* Settings grid */}
      <div className="grid grid-cols-1 pos-tablet:grid-cols-2 gap-2 pb-20 pos-tablet:pb-4 max-w-3xl">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:border-primary/40 hover:shadow-pos transition-all text-left"
          >
            <div className="h-9 w-9 rounded-lg bg-primary-tint flex items-center justify-center shrink-0">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground flex-1">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Employee modal */}
      <Dialog open={employeeOpen} onOpenChange={setEmployeeOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
          <EmployeeSettingsModal onClose={() => setEmployeeOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Employee Settings Modal ──
function EmployeeSettingsModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('employee');

  const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
    { key: 'employee', label: 'Employee Info', icon: User },
    { key: 'security', label: 'Security',      icon: Shield },
    { key: 'display',  label: 'Display',       icon: Monitor },
  ];

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Sidebar tabs */}
      <div className="w-48 shrink-0 border-r border-border bg-muted/30 p-3 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 px-2 py-3 mb-2 border-b border-border">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{(profile?.first_name || 'U').charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{profile?.first_name || 'Employee'}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{profile?.role}</p>
          </div>
        </div>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
              tab === key ? 'bg-primary-tint text-primary font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Close
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'employee' && <EmployeeInfoTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'display' && <DisplayTab />}
      </div>
    </div>
  );
}

// ── Employee Info Tab ──
function EmployeeInfoTab() {
  const { profile } = useAuth();
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Employee Info</h3>
        <p className="text-sm text-muted-foreground">Your profile information</p>
      </div>

      <section>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Personal</h4>
        <div className="space-y-3">
          <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={fullName} />
          <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={profile?.phone || '—'} />
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile?.email || '—'} />
        </div>
      </section>

      <section>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Work</h4>
        <div className="space-y-3">
          <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Role" value={profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : '—'} />
          <InfoRow icon={<Clock className="h-4 w-4" />} label="Status" value={profile?.is_active ? 'Active' : 'Inactive'} />
        </div>
      </section>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

// ── Security Tab (Change PIN) ──
type PinStep = 'current' | 'new' | 'confirm';

function SecurityTab() {
  const { profile } = useAuth();
  const [pinStep, setPinStep] = useState<PinStep>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activePin = pinStep === 'current' ? currentPin : pinStep === 'new' ? newPin : confirmPin;
  const setActivePin = pinStep === 'current' ? setCurrentPin : pinStep === 'new' ? setNewPin : setConfirmPin;

  const handleKey = (digit: string) => {
    if (activePin.length < 6) setActivePin((p) => p + digit);
  };
  const handleDelete = () => setActivePin((p) => p.slice(0, -1));

  const handleSubmit = async () => {
    setError('');
    if (pinStep === 'current') {
      if (currentPin !== (profile?.pin_code || '')) {
        setError('Incorrect current PIN');
        setCurrentPin('');
        return;
      }
      setPinStep('new');
    } else if (pinStep === 'new') {
      if (newPin.length < 4) { setError('PIN must be at least 4 digits'); return; }
      setPinStep('confirm');
    } else {
      if (confirmPin !== newPin) { setError('PINs do not match'); setConfirmPin(''); return; }
      setSaving(true);
      try {
        await supabase.from('profiles').update({ pin_code: newPin }).eq('id', profile!.id);
        toast.success('PIN updated successfully');
        setPinStep('current');
        setCurrentPin(''); setNewPin(''); setConfirmPin('');
      } catch {
        toast.error('Failed to update PIN');
      } finally {
        setSaving(false);
      }
    }
  };

  const stepLabels: Record<PinStep, string> = {
    current: 'Enter current PIN',
    new:     'Enter new PIN',
    confirm: 'Confirm new PIN',
  };

  return (
    <div className="p-6 flex flex-col items-center">
      <h3 className="text-base font-bold text-foreground mb-1 self-start">Security</h3>
      <p className="text-sm text-muted-foreground mb-6 self-start">Change your 4-6 digit PIN</p>

      <p className="text-sm font-semibold text-foreground mb-4">{stepLabels[pinStep]}</p>

      {/* PIN dots */}
      <div className="flex gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-all',
              i < activePin.length ? 'bg-primary border-primary' : 'border-border bg-transparent'
            )}
          />
        ))}
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <NumPad onKey={handleKey} onDelete={handleDelete} onSubmit={activePin.length >= 4 ? handleSubmit : undefined} className="max-w-[240px] w-full" />

      <Button
        className="w-full max-w-[240px] mt-4 h-12 font-bold"
        disabled={activePin.length < 4 || saving}
        onClick={handleSubmit}
      >
        {saving ? 'Saving...' : pinStep === 'confirm' ? 'Change PIN' : 'Continue'}
      </Button>
    </div>
  );
}

// ── Display Tab ──
function DisplayTab() {
  const { theme, setTheme } = useTheme();

  const modes = [
    { key: 'system', label: 'System',  icon: Laptop,  desc: 'Follows your device' },
    { key: 'light',  label: 'Light',   icon: Sun,     desc: 'Always light mode' },
    { key: 'dark',   label: 'Dark',    icon: Moon,    desc: 'Always dark mode' },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Display</h3>
        <p className="text-sm text-muted-foreground">Appearance settings</p>
      </div>

      <section>
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-3">Color Mode</Label>
        <div className="grid grid-cols-3 gap-3">
          {modes.map(({ key, label, icon: Icon, desc }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                theme === key ? 'border-primary bg-primary-tint' : 'border-border bg-card hover:border-primary/40'
              )}
            >
              {theme === key && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
              <Icon className={cn('h-6 w-6', theme === key ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-center">
                <p className={cn('text-xs font-semibold', theme === key ? 'text-primary' : 'text-foreground')}>{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
              {/* Preview thumbnail */}
              <div className={cn(
                'w-full h-8 rounded-md border border-border overflow-hidden',
                key === 'dark' ? 'bg-zinc-900' : key === 'light' ? 'bg-white' : 'bg-gradient-to-r from-white to-zinc-900'
              )}>
                <div className={cn(
                  'h-2 w-2/3 rounded mt-1.5 mx-1.5',
                  key === 'dark' ? 'bg-zinc-700' : 'bg-gray-200'
                )} />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
