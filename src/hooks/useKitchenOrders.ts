import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderService } from '@/services/orders';
import { kitchenSoundService } from '@/services/soundService';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types/database';

interface UseKitchenOrdersOptions {
  orgId?: string;
  locationId?: string;
  autoRefresh?: boolean;
}

export function useKitchenOrders({
  orgId,
  locationId,
  autoRefresh = true,
}: UseKitchenOrdersOptions) {
  const queryClient = useQueryClient();
  const previousIdsRef = useRef<Set<string>>(new Set());
  const rushAlertedRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const queryKey = useMemo(() => ['kitchen-orders', orgId, locationId], [orgId, locationId]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!orgId) return [] as Order[];
      return OrderService.getOpenTickets(orgId, locationId);
    },
    enabled: Boolean(orgId),
    refetchInterval: autoRefresh ? 3000 : false,
    staleTime: 1000,
  });

  useEffect(() => {
    if (!query.data) return;

    setLastRefresh(new Date());

    const currentIds = new Set(query.data.map((order) => order.id));

    if (mountedRef.current) {
      const newOrders = query.data.filter((order) => !previousIdsRef.current.has(order.id));
      for (const order of newOrders) {
        void kitchenSoundService.playNewOrderSound();
      }
    } else {
      mountedRef.current = true;
    }

    for (const order of query.data) {
      const minutesOpen = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
      if (minutesOpen >= 15 && !rushAlertedRef.current.has(order.id)) {
        rushAlertedRef.current.add(order.id);
        void kitchenSoundService.playRushAlert();
      }
      if (minutesOpen < 15 && rushAlertedRef.current.has(order.id)) {
        rushAlertedRef.current.delete(order.id);
      }
    }

    for (const orderId of Array.from(rushAlertedRef.current)) {
      if (!currentIds.has(orderId)) {
        rushAlertedRef.current.delete(orderId);
      }
    }

    previousIdsRef.current = currentIds;
  }, [query.data]);

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`kitchen-orders-${orgId}-${locationId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_lines',
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      setRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [locationId, orgId, queryClient, queryKey]);

  return {
    ...query,
    tickets: query.data ?? [],
    lastRefresh,
    realtimeConnected,
  };
}
