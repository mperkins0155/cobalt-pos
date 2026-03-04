import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, FileText } from 'lucide-react';
import type { Order } from '@/types/database';

export default function Tickets() {
  const navigate = useNavigate();
  const { organization, currentLocation } = useAuth();
  const [tickets, setTickets] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    OrderService.getOpenTickets(organization.id, currentLocation?.id)
      .then(setTickets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organization, currentLocation]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/pos')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">Open Tickets</h1>
      </header>
      <ScrollArea className="flex-1 p-3">
        {loading ? <p className="text-center py-8 text-muted-foreground">Loading...</p>
        : tickets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No open tickets</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <button key={t.id} className="w-full bg-card border rounded-lg p-3 text-left hover:border-primary transition-colors" onClick={() => navigate(`/orders/${t.id}`)}>
                <div className="flex justify-between">
                  <span className="font-mono font-medium text-sm">#{t.order_number}</span>
                  <span className="font-semibold">{formatCurrency(t.subtotal_amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.customer_name || 'Walk-in'} • {new Date(t.created_at).toLocaleTimeString()}</p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
