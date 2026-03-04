import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerService } from '@/services/customers';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, Plus, Users } from 'lucide-react';
import type { Customer } from '@/types/database';

export default function Customers() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        if (search.length >= 2) {
          const results = await CustomerService.search(organization.id, search);
          setCustomers(results);
        } else {
          const { customers } = await CustomerService.list(organization.id, { limit: 50 });
          setCustomers(customers);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [organization, search]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/pos')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">Customers</h1>
        <div className="ml-auto"><Button variant="ghost" size="sm" className="text-primary-foreground"><Plus className="h-4 w-4 mr-1" />New</Button></div>
      </header>
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        {customers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No customers found</p></div>
        ) : (
          <div className="space-y-2">
            {customers.map(c => (
              <button key={c.id} className="w-full bg-card border rounded-lg p-3 text-left hover:border-primary transition-colors" onClick={() => navigate(`/customers/${c.id}`)}>
                <p className="font-medium text-sm">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-muted-foreground">{c.email || c.phone || 'No contact info'}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.visit_count} visits • {formatCurrency(c.total_spent)} spent</p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
