import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PurchasingService } from '@/services/purchasing';
import { SupplierService } from '@/services/suppliers';
import { formatCurrency } from '@/lib/calculations';
import { DataTable } from '@/components/DataTable';
import { SearchBar, FilterPills, StatCard } from '@/components/pos';
import { purchaseOrderColumns } from '@/columns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { ShoppingBag, Plus, Loader2, Package, TrendingUp } from 'lucide-react';
import type { PurchaseOrder, Supplier } from '@/types/database';

export default function Purchasing() {
  const { organization, currentLocation, profile } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState('');
  const [eta, setEta] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [poResult, supResult] = await Promise.all([
        PurchasingService.list({ orgId: organization.id, locationId: currentLocation?.id, limit: 200 }),
        SupplierService.list(organization.id),
      ]);
      setOrders(poResult.orders);
      setSuppliers(supResult);
      if (!supplierId && supResult.length > 0) setSupplierId(supResult[0].id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [organization?.id, currentLocation?.id]);

  const totalAmount = useMemo(() => orders.reduce((s, o) => s + o.total_amount, 0), [orders]);
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    let r = orders;
    if (statusFilter !== 'all') r = r.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((o) =>
        o.po_number.toLowerCase().includes(q) ||
        (o.supplier?.name || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [orders, statusFilter, search]);

  const createPO = async () => {
    if (!organization || !supplierId) return;
    const num = Number(amount);
    if (Number.isNaN(num) || num <= 0) { toast.error('Enter a valid amount'); return; }
    setSubmitting(true);
    try {
      const created = await PurchasingService.create({
        orgId: organization.id,
        locationId: currentLocation?.id,
        supplierId,
        subtotalAmount: num,
        expectedDate: eta || undefined,
        notes: notes.trim() || undefined,
        createdBy: profile?.id,
      });
      setOrders((prev) => [created, ...prev]);
      toast.success(`PO #${created.po_number} created`);
      setAmount(''); setNotes(''); setShowForm(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All', count: statusCounts.all || 0 },
    { key: 'draft', label: 'Draft', count: statusCounts.draft || 0 },
    { key: 'ordered', label: 'Ordered', count: statusCounts.ordered || 0 },
    { key: 'received', label: 'Received', count: statusCounts.received || 0 },
    { key: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled || 0 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Purchase Orders</h2>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New PO
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 pos-desktop:grid-cols-3">
        <StatCard icon={<Package className="h-4 w-4" />} label="Total POs" value={orders.length} accent="primary" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Total Value" value={formatCurrency(totalAmount)} accent="success" />
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-sm">New Purchase Order</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 pos-tablet:grid-cols-2 pos-desktop:grid-cols-5">
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
            <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
            <Button onClick={createPO} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search PO # or supplier" />
        <FilterPills items={filterTabs} active={statusFilter} onChange={setStatusFilter} />
      </div>

      <DataTable
        columns={purchaseOrderColumns}
        data={filtered}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No purchase orders"
        emptyDescription="Create a purchase order to get started."
        emptyIcon={<ShoppingBag className="h-10 w-10" />}
      />
    </div>
  );
}
