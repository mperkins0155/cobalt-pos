import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Plus, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SupplierService } from '@/services/suppliers';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import type { Supplier } from '@/types/database';

export default function Suppliers() {
  const navigate = useNavigate();
  const { organization, currentLocation } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadSuppliers = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const { suppliers } = await SupplierService.list({
        orgId: organization.id,
        search: search.trim() || undefined,
        includeInactive: true,
      });
      setSuppliers(suppliers);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, [organization?.id, search]);

  const addSupplier = async () => {
    if (!organization) return;
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const created = await SupplierService.create({
        orgId: organization.id,
        locationId: currentLocation?.id,
        name: name.trim(),
        contactName: contact.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setSuppliers(prev => [created, ...prev]);
      toast.success('Supplier added');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add supplier');
    } finally {
      setSubmitting(false);
    }

    setName('');
    setContact('');
    setEmail('');
    setPhone('');
  };

  const toggleSupplierActive = async (supplier: Supplier) => {
    try {
      const updated = await SupplierService.update(supplier.id, { is_active: !supplier.is_active });
      setSuppliers(prev => prev.map(row => (row.id === supplier.id ? updated : row)));
      toast.success(updated.is_active ? 'Supplier activated' : 'Supplier archived');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update supplier');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Suppliers</h1>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs" onClick={() => navigate('/purchasing')}>
            Purchasing
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        <Card>
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="pl-9" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Add Supplier</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" />
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact person" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            <Button onClick={addSupplier} disabled={submitting || !organization}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Supplier Directory ({suppliers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!loading && suppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suppliers found.</p>
            ) : suppliers.map((supplier) => (
              <div key={supplier.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {supplier.contact_name || 'No contact'} • {supplier.email || supplier.phone || 'No contact info'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={supplier.is_active ? 'default' : 'secondary'}>{supplier.is_active ? 'active' : 'archived'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleSupplierActive(supplier)}>
                    {supplier.is_active ? 'Archive' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
