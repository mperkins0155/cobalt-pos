// ============================================================
// CloudPos — Command Palette
// Phase 1B: Global Cmd+K search using shadcn Command (cmdk)
// Searches: orders, customers, menu items, quick actions
// Last modified: V0.7.0.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { CustomerService } from '@/services/customers';
import { CatalogService } from '@/services/catalog';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  ClipboardList,
  Users,
  Tag,
  Plus,
  FileText,
  BarChart3,
  Grid3X3,
  ChefHat,
  Settings,
} from 'lucide-react';
import type { Order, Customer, Item } from '@/types/database';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Debounced search
  useEffect(() => {
    if (!open || !organization || query.length < 2) {
      setOrders([]);
      setCustomers([]);
      setItems([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [orderRes, customerRes, itemRes] = await Promise.allSettled([
          OrderService.listOrders({ orgId: organization.id, limit: 5 }),
          CustomerService.search(organization.id, query, 5),
          CatalogService.getItems(organization.id),
        ]);

        if (orderRes.status === 'fulfilled') {
          const q = query.toLowerCase();
          setOrders(
            orderRes.value.orders.filter(
              (o) =>
                o.order_number.toLowerCase().includes(q) ||
                (o.customer_name || '').toLowerCase().includes(q)
            ).slice(0, 5)
          );
        }
        if (customerRes.status === 'fulfilled') {
          setCustomers(customerRes.value.slice(0, 5));
        }
        if (itemRes.status === 'fulfilled') {
          const q = query.toLowerCase();
          setItems(
            itemRes.value
              .filter(
                (i) =>
                  i.name.toLowerCase().includes(q) ||
                  (i.sku || '').toLowerCase().includes(q)
              )
              .slice(0, 5)
          );
        }
      } catch {
        // Silent — search is best-effort
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [open, organization, query]);

  const runAction = useCallback(
    (path: string) => {
      onOpenChange(false);
      setQuery('');
      navigate(path);
    },
    [navigate, onOpenChange]
  );

  const handleSelect = useCallback(
    (value: string) => {
      onOpenChange(false);
      setQuery('');
      navigate(value);
    },
    [navigate, onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search orders, customers, items, or type a command..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions — always visible */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runAction('/pos')}>
            <Plus className="mr-2 h-4 w-4 text-primary" />
            New Order
          </CommandItem>
          <CommandItem onSelect={() => runAction('/dashboard')}>
            <BarChart3 className="mr-2 h-4 w-4 text-primary" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runAction('/pos/tickets')}>
            <ChefHat className="mr-2 h-4 w-4 text-primary" />
            Kitchen Display
          </CommandItem>
          <CommandItem onSelect={() => runAction('/reports/closeout')}>
            <FileText className="mr-2 h-4 w-4 text-primary" />
            Close Shift / Z-Report
          </CommandItem>
          <CommandItem onSelect={() => runAction('/table-floor')}>
            <Grid3X3 className="mr-2 h-4 w-4 text-primary" />
            Table Floor
          </CommandItem>
          <CommandItem onSelect={() => runAction('/settings')}>
            <Settings className="mr-2 h-4 w-4 text-primary" />
            Settings
          </CommandItem>
        </CommandGroup>

        {/* Search results — only when query has content */}
        {orders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Orders">
              {orders.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`order-${o.order_number}`}
                  onSelect={() => handleSelect(`/orders/${o.id}`)}
                >
                  <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">#{o.order_number}</span>
                  <span className="ml-2 text-muted-foreground text-sm">
                    {o.customer_name || 'Walk-in'}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {o.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {customers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`customer-${c.first_name}-${c.last_name}`}
                  onSelect={() => handleSelect(`/customers/${c.id}`)}
                >
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                  </span>
                  {c.phone && (
                    <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {items.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Menu Items">
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`item-${item.name}`}
                  onSelect={() => runAction('/pos')}
                >
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.name}</span>
                  {item.sku && (
                    <span className="ml-2 text-xs text-muted-foreground">{item.sku}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
