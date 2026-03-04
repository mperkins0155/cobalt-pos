import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/calculations';
import { SupplierService } from '@/services/suppliers';
import { QuotationService } from '@/services/quotations';
import { PurchasingService } from '@/services/purchasing';
import { toast } from '@/components/ui/sonner';
import type { Quotation, QuotationStatus, Supplier } from '@/types/database';

export default function Quotations() {
  const navigate = useNavigate();
  const { organization, currentLocation, profile } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [total, setTotal] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [activeQuote, setActiveQuote] = useState<Quotation | null>(null);
  const [sendToEmail, setSendToEmail] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [supplierResult, quoteResult] = await Promise.all([
        SupplierService.list({ orgId: organization.id, includeInactive: false, limit: 500 }),
        QuotationService.list({ orgId: organization.id, locationId: currentLocation?.id, limit: 200 }),
      ]);
      setSuppliers(supplierResult.suppliers);
      setQuotes(quoteResult.quotations);
      if (!supplierId && supplierResult.suppliers.length > 0) {
        setSupplierId(supplierResult.suppliers[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization?.id, currentLocation?.id]);

  const addQuote = async () => {
    if (!organization) return;
    const numericTotal = Number(total);
    if (Number.isNaN(numericTotal) || numericTotal <= 0) return;

    setSubmitting(true);
    try {
      const created = await QuotationService.create({
        orgId: organization.id,
        supplierId: supplierId || undefined,
        locationId: currentLocation?.id,
        validUntil: validUntil || undefined,
        notes: notes.trim() || undefined,
        createdBy: profile?.id,
        lines: [
          {
            item_name: 'Quoted items',
            quantity: 1,
            unit_cost: numericTotal,
            line_total: numericTotal,
          },
        ],
      });
      setQuotes(prev => [created, ...prev]);
      toast.success('Quotation created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create quotation');
    } finally {
      setSubmitting(false);
    }

    setTotal('');
    setValidUntil('');
    setNotes('');
  };

  const setStatus = async (quote: Quotation, status: QuotationStatus, metadata?: Record<string, unknown>) => {
    setUpdatingId(quote.id);
    try {
      const updated = await QuotationService.transitionStatus({
        quotationId: quote.id,
        status,
        actorUserId: profile?.id,
        metadata,
      });
      setQuotes(prev => prev.map(row => (row.id === quote.id ? updated : row)));
      toast.success(`Quotation marked ${status}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update quotation');
    } finally {
      setUpdatingId(null);
    }
  };

  const openSendDialog = (quote: Quotation) => {
    setActiveQuote(quote);
    setSendToEmail(quote.supplier?.email || quote.sent_to_email || '');
    setSendSubject(`Quotation ${quote.quotation_number} from Cobalt POS`);
    setSendMessage('');
    setSendDialogOpen(true);
  };

  const submitSendQuote = async () => {
    if (!activeQuote) return;

    const trimmedDestination = sendToEmail.trim();
    if (!trimmedDestination) {
      toast.error('Email destination is required');
      return;
    }

    setUpdatingId(activeQuote.id);
    try {
      const { quotation, delivery } = await QuotationService.sendQuotation({
        quotationId: activeQuote.id,
        actorUserId: profile?.id,
        toEmail: trimmedDestination,
        subject: sendSubject.trim() || undefined,
        message: sendMessage.trim() || undefined,
      });
      setQuotes(prev => prev.map(row => (row.id === activeQuote.id ? quotation : row)));
      toast.success(`Quotation sent to ${delivery.toEmail}`);
      setSendDialogOpen(false);
      setActiveQuote(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send quotation');
    } finally {
      setUpdatingId(null);
    }
  };

  const openRejectDialog = (quote: Quotation) => {
    setActiveQuote(quote);
    setRejectReason(quote.status_reason || '');
    setRejectDialogOpen(true);
  };

  const submitRejectQuote = async () => {
    if (!activeQuote) return;
    await setStatus(activeQuote, 'rejected', { reason: rejectReason.trim() || undefined });
    setRejectDialogOpen(false);
    setActiveQuote(null);
  };

  const convertToPurchaseOrder = async (quote: Quotation) => {
    if (!organization || !quote.supplier_id) {
      toast.error('Quote needs a supplier before conversion');
      return;
    }

    setUpdatingId(quote.id);
    try {
      const fullQuote = await QuotationService.getById(quote.id);
      const po = await PurchasingService.create({
        orgId: organization.id,
        supplierId: quote.supplier_id,
        locationId: fullQuote.location_id,
        quotationId: quote.id,
        notes: fullQuote.notes || undefined,
        createdBy: profile?.id,
        lines: (fullQuote.lines || []).map(line => ({
          item_id: line.item_id,
          variant_id: line.variant_id,
          item_name: line.item_name,
          sku: line.sku,
          quantity_ordered: line.quantity,
          unit_cost: line.unit_cost,
          discount_amount: line.discount_amount,
          tax_amount: line.tax_amount,
          line_total: line.line_total,
        })),
      });
      const updatedQuote = await QuotationService.transitionStatus({
        quotationId: quote.id,
        status: 'converted',
        actorUserId: profile?.id,
        metadata: { purchase_order_id: po.id },
      });
      setQuotes(prev => prev.map(row => (row.id === quote.id ? updatedQuote : row)));
      toast.success(`Converted to PO ${po.po_number}`);
      navigate('/purchasing');
    } catch (error) {
      console.error(error);
      toast.error('Failed to convert quotation');
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
        <h1 className="text-lg font-bold">Quotations</h1>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs" onClick={() => navigate('/expenses')}>
            Expenses
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">New Quote</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">No supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
            <Input type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Total" />
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
            <Button onClick={addQuote} disabled={submitting || !organization}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Quote
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Active Quotes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!loading && quotes.length === 0 ? <p className="text-sm text-muted-foreground">No quotations found.</p> : null}
            {quotes.map((quote) => (
              <div key={quote.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{quote.quotation_number} • {quote.supplier?.name || 'No supplier'}</p>
                    <p className="text-xs text-muted-foreground">Valid through {quote.valid_until || 'n/a'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(quote.total_amount)}</p>
                    <Badge variant={quote.status === 'sent' || quote.status === 'accepted' || quote.status === 'converted' ? 'default' : 'secondary'}>{quote.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quote.status === 'draft' && (
                    <Button size="sm" variant="outline" disabled={updatingId === quote.id} onClick={() => openSendDialog(quote)}>Send</Button>
                  )}
                  {(quote.status === 'sent' || quote.status === 'draft') && (
                    <Button size="sm" variant="outline" disabled={updatingId === quote.id} onClick={() => setStatus(quote, 'accepted')}>Accept</Button>
                  )}
                  {(quote.status === 'sent' || quote.status === 'draft') && (
                    <Button size="sm" variant="outline" disabled={updatingId === quote.id} onClick={() => openRejectDialog(quote)}>
                      Reject
                    </Button>
                  )}
                  {quote.status === 'accepted' && (
                    <Button size="sm" disabled={updatingId === quote.id} onClick={() => convertToPurchaseOrder(quote)}>Convert to PO</Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quotation</DialogTitle>
            <DialogDescription>
              Deliver {activeQuote?.quotation_number || 'quotation'} by email and mark it as sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="send-to-email">To</Label>
              <Input id="send-to-email" type="email" value={sendToEmail} onChange={(e) => setSendToEmail(e.target.value)} placeholder="supplier@example.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="send-subject">Subject</Label>
              <Input id="send-subject" value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} placeholder="Quotation subject" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="send-message">Message (optional)</Label>
              <Textarea id="send-message" value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} placeholder="Additional context for supplier..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={updatingId === activeQuote?.id}>
              Cancel
            </Button>
            <Button onClick={() => void submitSendQuote()} disabled={!activeQuote || updatingId === activeQuote.id}>
              {updatingId === activeQuote?.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Send Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quotation</DialogTitle>
            <DialogDescription>
              Optionally store a reason for rejecting {activeQuote?.quotation_number || 'this quotation'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Textarea id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Pricing not acceptable, lead time too long..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={updatingId === activeQuote?.id}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void submitRejectQuote()} disabled={!activeQuote || updatingId === activeQuote.id}>
              {updatingId === activeQuote?.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Reject Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
