import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/calculations';
import { PurchasingService } from '@/services/purchasing';
import { SupplierService } from '@/services/suppliers';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from '@/types/database';

export default function Purchasing() {
  const navigate = useNavigate();
  const { organization, currentLocation, profile } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState('');
  const [eta, setEta] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [supplierResult, poResult] = await Promise.all([
        SupplierService.list({ orgId: organization.id, includeInactive: false, limit: 500 }),
        PurchasingService.list({ orgId: organization.id, locationId: currentLocation?.id, limit: 200 }),
      ]);
      setSuppliers(supplierResult.suppliers);
      setOrders(poResult.purchaseOrders);
      if (!supplierId && supplierResult.suppliers.length > 0) {
        setSupplierId(supplierResult.suppliers[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load purchasing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization?.id, currentLocation?.id]);

  const totalOpen = useMemo(
    () => orders
      .filter(order => ['draft', 'submitted', 'approved', 'partially_received'].includes(order.status))
      .reduce((sum, order) => sum + order.total_amount, 0),
    [orders]
  );

  const addOrder = async () => {
    if (!organization || !supplierId) return;
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) return;

    setSubmitting(true);
    try {
      const created = await PurchasingService.create({
        orgId: organization.id,
        supplierId,
        locationId: currentLocation?.id,
        expectedDate: eta || undefined,
        notes: notes.trim() || undefined,
        createdBy: profile?.id,
        lines: [
          {
            item_name: 'General purchase',
            quantity_ordered: 1,
            unit_cost: numericAmount,
            line_total: numericAmount,
          },
        ],
      });
      setOrders(prev => [created, ...prev]);
      toast.success('Purchase order created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }

    setAmount('');
    setEta(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setNotes('');
  };

  const setStatus = async (po: PurchaseOrder, status: PurchaseOrderStatus) => {
    setUpdatingId(po.id);
    try {
      const updated = await PurchasingService.setStatus(po.id, status);
      setOrders(prev => prev.map(row => (row.id === po.id ? updated : row)));
      toast.success(`PO marked ${status}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update PO status');
    } finally {
      setUpdatingId(null);
    }
  };

  const receiveOrder = async (po: PurchaseOrder) => {
    if (!profile) {
      toast.error('User context is required to receive inventory');
      return;
    }

    setUpdatingId(po.id);
    try {
      const result = await PurchasingService.receivePurchaseOrder({
        purchaseOrderId: po.id,
        receivedBy: profile.id,
        locationId: currentLocation?.id,
        notes: 'Received from Purchasing screen',
      });
      setOrders(prev => prev.map(row => (row.id === po.id ? result.purchaseOrder : row)));
      toast.success(`Received ${result.receipt.inventoryEventsCreated} inventory line(s)`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to receive purchase order');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Purchasing</h1>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs" onClick={() => navigate('/suppliers')}>
            Suppliers
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create Purchase Order</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
            <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
            <Button onClick={addOrder} disabled={submitting || !organization || !supplierId}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add PO
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Open Purchase Orders ({formatCurrency(totalOpen)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!loading && orders.length === 0 ? <p className="text-sm text-muted-foreground">No purchase orders found.</p> : null}
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{order.po_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.supplier?.name || 'Supplier'} • Expected {order.expected_date || 'n/a'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(order.total_amount)}</p>
                    <Badge variant={order.status === 'received' ? 'default' : 'secondary'}>{order.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {order.status === 'draft' && (
                    <Button size="sm" variant="outline" disabled={updatingId === order.id} onClick={() => setStatus(order, 'submitted')}>
                      Submit
                    </Button>
                  )}
                  {order.status === 'submitted' && (
                    <Button size="sm" variant="outline" disabled={updatingId === order.id} onClick={() => setStatus(order, 'approved')}>
                      Approve
                    </Button>
                  )}
                  {(order.status === 'approved' || order.status === 'partially_received') && (
                    <Button size="sm" disabled={updatingId === order.id} onClick={() => receiveOrder(order)}>
                      Receive Stock
                    </Button>
                  )}
                  {order.status !== 'received' && order.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" disabled={updatingId === order.id} onClick={() => setStatus(order, 'cancelled')}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
