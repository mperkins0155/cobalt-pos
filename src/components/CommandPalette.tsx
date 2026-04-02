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

  useEffect(() => {
    if (!open || !organization || query.length < 2) {
      setOrders([]);
      setCustomers([]);
      setItems([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [orderResult, customerResult, itemResult] = await Promise.allSettled([
          OrderService.listOrders({ orgId: organization.id, limit: 5 }),
          CustomerService.search(organization.id, query, 5),
          CatalogService.getItems(organization.id),
        ]);

        if (orderResult.status === 'fulfilled') {
          const normalized = query.toLowerCase();
          setOrders(
            orderResult.value.orders
              .filter(
                (order) =>
                  order.order_number.toLowerCase().includes(normalized) ||
                  (order.customer_name || '').toLowerCase().includes(normalized)
              )
              .slice(0, 5)
          );
        }

        if (customerResult.status === 'fulfilled') {
          setCustomers(customerResult.value.slice(0, 5));
        }

        if (itemResult.status === 'fulfilled') {
          const normalized = query.toLowerCase();
          setItems(
            itemResult.value
              .filter(
                (item) =>
                  item.name.toLowerCase().includes(normalized) ||
                  (item.sku || '').toLowerCase().includes(normalized)
              )
              .slice(0, 5)
          );
        }
      } catch {
        // Search is best-effort only.
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [open, organization, query]);

  const runAction = useCallback((path: string) => {
    onOpenChange(false);
    setQuery('');
    navigate(path);
  }, [navigate, onOpenChange]);

  const handleSelect = useCallback((path: string) => {
    onOpenChange(false);
    setQuery('');
    navigate(path);
  }, [navigate, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search orders, customers, items, or type a command..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

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

        {orders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Orders">
              {orders.map((order) => (
                <CommandItem
                  key={order.id}
                  value={`order-${order.order_number}`}
                  onSelect={() => handleSelect(`/orders/${order.id}`)}
                >
                  <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">#{order.order_number}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {order.customer_name || 'Walk-in'}
                  </span>
                  <span className="ml-auto text-xs capitalize text-muted-foreground">
                    {order.status}
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
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`customer-${customer.first_name}-${customer.last_name}`}
                  onSelect={() => handleSelect(`/customers/${customer.id}`)}
                >
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {[customer.first_name, customer.last_name].filter(Boolean).join(' ')}
                  </span>
                  {customer.phone && (
                    <span className="ml-2 text-xs text-muted-foreground">{customer.phone}</span>
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
