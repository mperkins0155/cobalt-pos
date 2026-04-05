// ============================================================
// CloudPos — Settings Page
// Phase 0D: Enhanced from cobalt-pos Settings with CloudPos design
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import {
  Settings as SettingsIcon,
  Users,
  FileText,
  Shield,
  CalendarDays,
  LayoutGrid,
  Truck,
  ShoppingBag,
  Wallet,
  ChevronRight,
} from 'lucide-react';

const settingsItems = [
  { icon: Users, label: 'Staff', description: 'Manage staff and roles', path: '/staff' },
  { icon: CalendarDays, label: 'Reservations', description: 'Manage guest bookings', path: '/reservations' },
  { icon: LayoutGrid, label: 'Table Floor', description: 'View and update table status', path: '/table-floor' },
  { icon: Truck, label: 'Suppliers', description: 'Supplier contacts and partners', path: '/suppliers' },
  { icon: ShoppingBag, label: 'Purchasing', description: 'Track purchase orders', path: '/purchasing' },
  { icon: FileText, label: 'Quotations', description: 'Create and review quotes', path: '/quotations' },
  { icon: Wallet, label: 'Expenses', description: 'Log and monitor expenses', path: '/expenses' },
  { icon: Shield, label: 'Audit Log', description: 'Activity history (coming soon)', path: '/settings' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { organization } = useAuth();

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Settings</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{organization?.name || 'Organization'}</p>

      {/* Settings grid */}
      <div className="grid grid-cols-1 pos-tablet:grid-cols-2 gap-2 pb-20 pos-tablet:pb-4 max-w-3xl">
        {settingsItems.map((item) => (
          <Card
            key={item.label}
            className="cursor-pointer hover:shadow-pos hover:border-primary/30 transition-all"
            onClick={() => navigate(item.path)}
          >
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary-tint flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
