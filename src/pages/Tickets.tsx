import { useEffect, useMemo, useState } from 'react';
import { ChefHat, CheckCircle, Clock, RefreshCw, Settings2, Volume2, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { kitchenSoundService } from '@/services/soundService';
import { OrderService } from '@/services/orders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FilterPills, EmptyState } from '@/components/pos';
import { SoundSettings } from '@/components/kitchen/SoundSettings';
import { toast } from '@/components/ui/sonner';
import type { Order } from '@/types/database';

function urgencyMeta(createdAt: string) {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (minutes < 10) {
    return { border: 'border-success/40', text: 'text-success', tone: 'Fresh', minutes };
  }
  if (minutes < 20) {
    return { border: 'border-warning/40', text: 'text-warning', tone: 'Working', minutes };
  }
  return { border: 'border-destructive/40', text: 'text-destructive', tone: 'Rush', minutes };
}

function formatRefreshTime(date: Date | null) {
  if (!date) return 'Waiting for first refresh';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  return `Updated ${Math.floor(seconds / 60)}m ago`;
}

function TicketCard({
  ticket,
  bumpingId,
  onBump,
}: {
  ticket: Order;
  bumpingId: string | null;
  onBump: (order: Order) => void;
}) {
  const urgency = urgencyMeta(ticket.created_at);
  const isBumping = bumpingId === ticket.id;
  const typeLabel =
    ticket.order_type === 'dine_in'
      ? 'Dine In'
      : ticket.order_type === 'takeout'
        ? 'Take Away'
        : ticket.order_type;

  return (
    <div className={`rounded-xl border-2 bg-card p-4 shadow-pos ${urgency.border}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-primary">#{ticket.order_number}</p>
          <p className="truncate text-sm font-medium text-foreground">
            {ticket.customer_name || 'Walk-in'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary" className="text-[10px]">
            {typeLabel}
          </Badge>
          <span className={`flex items-center gap-1 text-xs font-semibold ${urgency.text}`}>
            <Clock className="h-3 w-3" />
            {urgency.minutes}m
          </span>
        </div>
      </div>

      <div className="mb-3 rounded-lg bg-muted/50 px-3 py-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          <span>Kitchen status</span>
          <span className={urgency.text}>{urgency.tone}</span>
        </div>
      </div>

      <div className="mb-4 space-y-1.5">
        {(ticket.lines || []).length > 0 ? (
          (ticket.lines || []).slice(0, 7).map((line) => (
            <div key={line.id} className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-foreground">
                  <span className="font-semibold">{line.quantity}×</span> {line.item_name}
                </span>
              </div>
              {line.modifiers && line.modifiers.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {line.modifiers.map((modifier) => modifier.option_name).join(', ')}
                </p>
              )}
              {line.notes && (
                <p className="mt-1 text-xs italic text-primary">{line.notes}</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No line items loaded.</p>
        )}
        {(ticket.lines || []).length > 7 && (
          <p className="text-xs text-muted-foreground">
            +{(ticket.lines || []).length - 7} more items
          </p>
        )}
      </div>

      <Button
        variant="outline"
        className="w-full"
        disabled={isBumping}
        onClick={() => onBump(ticket)}
      >
        <CheckCircle className="mr-1.5 h-4 w-4" />
        {isBumping ? 'Bumping...' : 'Bump Order'}
      </Button>
    </div>
  );
}

export default function Tickets() {
  const { organization, currentLocation } = useAuth();
  const [view, setView] = useState<'active' | 'takeaway'>('active');
  const [typeFilter, setTypeFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [bumpingId, setBumpingId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(kitchenSoundService.getSettings().enabled);

  const {
    tickets,
    isLoading,
    isFetching,
    error,
    refetch,
    lastRefresh,
    realtimeConnected,
  } = useKitchenOrders({
    orgId: organization?.id,
    locationId: currentLocation?.id,
    autoRefresh,
  });

  useEffect(() => {
    setSoundEnabled(kitchenSoundService.getSettings().enabled);
  }, []);

  const stats = useMemo(() => {
    const urgent = tickets.filter((ticket) => urgencyMeta(ticket.created_at).minutes >= 15).length;
    const takeaway = tickets.filter((ticket) => ticket.order_type === 'takeout').length;
    const dineIn = tickets.filter((ticket) => ticket.order_type === 'dine_in').length;
    return {
      total: tickets.length,
      urgent,
      takeaway,
      dineIn,
    };
  }, [tickets]);

  const filterTabs = [
    { key: 'all', label: 'All', count: tickets.length },
    { key: 'dine_in', label: 'Dine In', count: stats.dineIn },
    { key: 'takeout', label: 'Take Away', count: stats.takeaway },
  ];

  const visibleTickets = useMemo(() => {
    const base =
      view === 'takeaway'
        ? tickets.filter((ticket) => ticket.order_type === 'takeout')
        : tickets;

    if (typeFilter === 'all') return base;
    return base.filter((ticket) => ticket.order_type === typeFilter);
  }, [tickets, typeFilter, view]);

  const bumpOrder = async (order: Order) => {
    setBumpingId(order.id);
    try {
      await OrderService.updateStatus(order.id, 'paid', {
        completed_at: new Date().toISOString(),
      });
      if (order.order_type === 'takeout') {
        await kitchenSoundService.playOrderReadySound('takeout');
      } else {
        await kitchenSoundService.playOrderReadySound(order.order_type);
      }
      toast.success(`Order #${order.order_number} bumped`);
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error('Failed to bump order');
    } finally {
      setBumpingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-pos">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary-tint p-2.5">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Kitchen Display</h2>
              <p className="text-sm text-muted-foreground">
                {formatRefreshTime(lastRefresh)}
                {' • '}
                {realtimeConnected ? 'Realtime active' : autoRefresh ? 'Polling every 3s' : 'Manual refresh'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-primary-tint text-primary">
              {stats.total} Open
            </Badge>
            <Badge variant="secondary" className="bg-warning-tint text-warning">
              {stats.urgent} Rush
            </Badge>
            <Badge variant="secondary" className="bg-success-tint text-success">
              {stats.takeaway} Takeout
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh((current) => !current)}
            >
              {autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => void refetch()}
              aria-label="Refresh kitchen orders"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Kitchen sound settings">
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-4">
                <SoundSettings onSettingsChange={(settings) => setSoundEnabled(settings.enabled)} />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {realtimeConnected ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-success" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-warning" />
                  Fallback
                </>
              )}
            </div>
          </div>
        </div>

        <Tabs value={view} onValueChange={(value) => setView(value as 'active' | 'takeaway')}>
          <TabsList className="grid w-full grid-cols-2 lg:w-[360px]">
            <TabsTrigger value="active">Kitchen Orders</TabsTrigger>
            <TabsTrigger value="takeaway">Takeaway Board</TabsTrigger>
          </TabsList>

          <TabsContent value={view} className="mt-3">
            <FilterPills items={filterTabs} active={typeFilter} onChange={setTypeFilter} />
          </TabsContent>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid gap-3 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<WifiOff className="h-10 w-10" />}
              title="Kitchen feed unavailable"
              description="Realtime failed or the kitchen query could not load. You can retry manually."
              action={
                <Button onClick={() => void refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : visibleTickets.length === 0 ? (
        <EmptyState
          icon={<ChefHat className="h-10 w-10" />}
          title={view === 'takeaway' ? 'No takeaway orders waiting' : 'Kitchen is clear'}
          description="New tickets will appear automatically when they are opened."
        />
      ) : (
        <div className="grid gap-3 pb-20 pos-tablet:grid-cols-2 pos-tablet:pb-4 pos-desktop:grid-cols-3">
          {visibleTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              bumpingId={bumpingId}
              onBump={bumpOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
