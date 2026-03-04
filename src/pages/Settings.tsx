import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, Users, DollarSign, Percent, MapPin, Printer, ReceiptText, FileText, Shield,
  CalendarDays, LayoutGrid, Truck, ShoppingBag, Wallet,
} from 'lucide-react';

const settingsItems = [
  { icon: Users, label: 'Team', description: 'Invite staff, manage roles', path: '/settings/team' },
  { icon: DollarSign, label: 'Taxes', description: 'Tax rates & configuration', path: '/settings/taxes' },
  { icon: Percent, label: 'Tips', description: 'Tip settings & suggestions', path: '/settings/tips' },
  { icon: MapPin, label: 'Locations', description: 'Manage locations', path: '/settings/locations' },
  { icon: Printer, label: 'Hardware', description: 'Printers & scanners', path: '/settings/hardware' },
  { icon: ReceiptText, label: 'Receipts', description: 'Receipt templates', path: '/settings/receipts' },
  { icon: FileText, label: 'Reason Codes', description: 'Refund & void reasons', path: '/settings/reason-codes' },
  { icon: Shield, label: 'Audit Log', description: 'Activity history', path: '/settings/audit' },
  { icon: CalendarDays, label: 'Reservations', description: 'Manage guest bookings', path: '/reservations' },
  { icon: LayoutGrid, label: 'Table Floor', description: 'View and update table status', path: '/table-floor' },
  { icon: Truck, label: 'Suppliers', description: 'Supplier contacts and partners', path: '/suppliers' },
  { icon: ShoppingBag, label: 'Purchasing', description: 'Track purchase orders', path: '/purchasing' },
  { icon: FileText, label: 'Quotations', description: 'Create and review quotes', path: '/quotations' },
  { icon: Wallet, label: 'Expenses', description: 'Log and monitor expenses', path: '/expenses' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { organization } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/pos')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">Settings</h1>
      </header>
      <div className="p-4 max-w-lg mx-auto space-y-2">
        <p className="text-sm text-muted-foreground mb-3">{organization?.name}</p>
        {settingsItems.map(item => (
          <Card key={item.label} className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate(item.path)}>
            <CardContent className="py-3 flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.description}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
