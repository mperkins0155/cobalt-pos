import { supabase } from '@/lib/supabase';
import type { Quotation, QuotationLine, QuotationStatus, PurchaseOrder } from '@/types/database';
import { v4 as uuid } from 'uuid';
import { AuditService } from './audit';

const TRANSITION_FUNCTION_MISSING_CODE = 'PGRST202';

export function isValidQuotationStatusTransition(fromStatus: QuotationStatus, toStatus: QuotationStatus): boolean {
  if (fromStatus === toStatus) return true;

  const allowed: Record<QuotationStatus, QuotationStatus[]> = {
    draft: ['sent', 'accepted', 'rejected', 'expired', 'converted'],
    sent: ['accepted', 'rejected', 'expired', 'converted'],
    accepted: ['converted', 'rejected'],
    rejected: ['draft'],
    expired: ['draft'],
    converted: [],
  };

  return allowed[fromStatus].includes(toStatus);
}

export const QuotationService = {
  async getById(id: string): Promise<Quotation> {
    const { data, error } = await supabase
      .from('quotations')
      .select('*, supplier:suppliers(*), lines:quotation_items(*, item:items(*), variant:variants(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Quotation;
  },

  async create(params: {
    orgId: string;
    supplierId?: string;
    locationId?: string;
    quoteNumber?: string;
    quoteDate?: string;
    validUntil?: string;
    currency?: string;
    notes?: string;
    createdBy?: string;
    lines?: Array<{
      item_id?: string;
      variant_id?: string;
      item_name: string;
      sku?: string;
      quantity: number;
      unit_cost: number;
      discount_amount?: number;
      tax_amount?: number;
      line_total?: number;
    }>;
  }): Promise<Quotation> {
    const quoteId = uuid();
    const lines = params.lines || [];
    const subtotal = lines.reduce((sum, line) => sum + ((line.line_total ?? line.quantity * line.unit_cost) || 0), 0);
    const tax = lines.reduce((sum, line) => sum + ((line.tax_rate || 0) * ((line.line_total ?? line.quantity * line.unit_cost) || 0) / 100), 0);
    const total = subtotal + tax;

    const { data: quote, error: quoteError } = await supabase
      .from('quotations')
      .insert({
        id: quoteId,
        org_id: params.orgId,
        supplier_id: params.supplierId,
        location_id: params.locationId,
        quotation_number: params.quoteNumber || `Q-${Date.now()}`,
        status: 'draft',
        quote_date: params.quoteDate || new Date().toISOString(),
        valid_until: params.validUntil,
        currency: params.currency || 'USD',
        subtotal_amount: subtotal,
        discount_amount: 0,
        tax_amount: tax,
        shipping_amount: 0,
        total_amount: total,
        notes: params.notes,
        created_by: params.createdBy,
      })
      .select()
      .single();
    if (quoteError) throw quoteError;

    if (lines.length > 0) {
      const payload = lines.map(line => ({
        id: uuid(),
        quotation_id: quoteId,
        item_id: line.item_id,
        variant_id: line.variant_id,
        item_name: line.item_name,
        sku: line.sku,
        quantity: line.quantity,
        unit_cost: line.unit_cost,
        discount_amount: line.discount_amount ?? 0,
        tax_amount: line.tax_amount ?? 0,
        line_total: line.line_total ?? line.quantity * line.unit_cost,
      }));
      const { error: lineError } = await supabase.from('quotation_items').insert(payload);
      if (lineError) throw lineError;
    }

    return quote as Quotation;
  },

  async update(id: string, updates: Partial<Quotation>): Promise<Quotation> {
    const { data, error } = await supabase
      .from('quotations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Quotation;
  },

  async upsertLines(quotationId: string, lines: Array<Partial<QuotationLine> & { item_name: string; quantity: number; unit_cost: number }>): Promise<void> {
    const payload = lines.map(line => ({
      id: line.id || uuid(),
      quotation_id: quotationId,
      item_id: line.item_id,
      variant_id: line.variant_id,
      item_name: line.item_name,
      sku: line.sku,
      quantity: line.quantity,
      unit_cost: line.unit_cost,
      discount_amount: line.discount_amount ?? 0,
      tax_amount: line.tax_amount ?? 0,
      line_total: line.line_total ?? line.quantity * line.unit_cost,
    }));

    const { error } = await supabase
      .from('quotation_items')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  },

  async setStatus(id: string, status: QuotationStatus): Promise<Quotation> {
    return this.update(id, { status });
  },

  async transitionStatus(params: {
    quotationId: string;
    status: QuotationStatus;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Quotation> {
    const metadata = params.metadata || {};

    const { data, error } = await supabase.rpc('transition_quotation_status', {
      p_quotation_id: params.quotationId,
      p_new_status: params.status,
      p_actor_user_id: params.actorUserId || null,
      p_metadata: metadata,
    });

    if (!error && data) return data as Quotation;

    if (error?.code !== TRANSITION_FUNCTION_MISSING_CODE) throw error;

    const current = await this.getById(params.quotationId);
    if (!isValidQuotationStatusTransition(current.status, params.status)) {
      throw new Error(`Invalid quotation status transition: ${current.status} -> ${params.status}`);
    }

    const updates: Partial<Quotation> = {
      status: params.status,
      status_changed_at: new Date().toISOString(),
      status_changed_by: params.actorUserId,
    };

    if (params.status === 'sent') {
      updates.sent_at = new Date().toISOString();
      updates.sent_to_email = String(metadata.to_email || current.sent_to_email || '');
      updates.sent_by = params.actorUserId;
      updates.sent_provider = metadata.provider ? String(metadata.provider) : undefined;
      updates.sent_provider_message_id = metadata.provider_message_id ? String(metadata.provider_message_id) : undefined;
    }

    if (params.status === 'accepted') {
      updates.accepted_at = new Date().toISOString();
      updates.status_reason = undefined;
    }

    if (params.status === 'rejected') {
      updates.rejected_at = new Date().toISOString();
      updates.status_reason = metadata.reason ? String(metadata.reason) : undefined;
    }

    const updated = await this.update(params.quotationId, updates);

    if (params.actorUserId) {
      await AuditService.log({
        orgId: updated.org_id,
        actorUserId: params.actorUserId,
        actionType: 'quotation_status_changed',
        entityType: 'quotation',
        entityId: updated.id,
        metadata: {
          from_status: current.status,
          to_status: params.status,
          ...metadata,
        },
      });

      if (params.status === 'sent') {
        await AuditService.log({
          orgId: updated.org_id,
          actorUserId: params.actorUserId,
          actionType: 'quotation_sent',
          entityType: 'quotation',
          entityId: updated.id,
          metadata: {
            to_email: updates.sent_to_email,
            provider: updates.sent_provider,
            provider_message_id: updates.sent_provider_message_id,
          },
        });
      }
    }

    return updated;
  },

  async sendQuotation(params: {
    quotationId: string;
    actorUserId?: string;
    toEmail?: string;
    subject?: string;
    message?: string;
  }): Promise<{ quotation: Quotation; delivery: { provider: string; providerMessageId?: string; toEmail: string; subject: string } }> {
    const { data, error } = await supabase.functions.invoke('send-quotation-email', {
      body: {
        quotationId: params.quotationId,
        toEmail: params.toEmail,
        subject: params.subject,
        message: params.message,
      },
    });

    if (error) throw error;

    const delivery = {
      provider: String(data?.provider || 'unknown'),
      providerMessageId: data?.providerMessageId ? String(data.providerMessageId) : undefined,
      toEmail: String(data?.toEmail || params.toEmail || ''),
      subject: String(data?.subject || params.subject || ''),
    };

    if (!delivery.toEmail) {
      throw new Error('Email sent but destination address was not returned');
    }

    const quotation = await this.transitionStatus({
      quotationId: params.quotationId,
      status: 'sent',
      actorUserId: params.actorUserId,
      metadata: {
        to_email: delivery.toEmail,
        provider: delivery.provider,
        provider_message_id: delivery.providerMessageId,
      },
    });

    return { quotation, delivery };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    if (error) throw error;
  },

  async list(params: {
    orgId: string;
    supplierId?: string;
    locationId?: string;
    status?: QuotationStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ quotations: Quotation[]; count: number }> {
    let query = supabase
      .from('quotations')
      .select('*, supplier:suppliers(name, code)', { count: 'exact' })
      .eq('org_id', params.orgId)
      .order('created_at', { ascending: false });

    if (params.supplierId) query = query.eq('supplier_id', params.supplierId);
    if (params.locationId) query = query.eq('location_id', params.locationId);
    if (params.status) query = query.eq('status', params.status);
    if (params.dateFrom) query = query.gte('quote_date', params.dateFrom);
    if (params.dateTo) query = query.lte('quote_date', params.dateTo);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { quotations: (data || []) as Quotation[], count: count || 0 };
  },

  async convertToPurchaseOrderStub(params: {
    quotationId: string;
    createdBy: string;
  }): Promise<{ quotation: Quotation; purchaseOrderDraft: Partial<PurchaseOrder> }> {
    const quotation = await this.getById(params.quotationId);

    const purchaseOrderDraft: Partial<PurchaseOrder> = {
      org_id: quotation.org_id,
      supplier_id: quotation.supplier_id || '',
      location_id: quotation.location_id,
      quotation_id: quotation.id,
      status: 'draft',
      currency: quotation.currency,
      subtotal_amount: quotation.subtotal_amount,
      discount_amount: quotation.discount_amount,
      tax_amount: quotation.tax_amount,
      shipping_amount: 0,
      total_amount: quotation.total_amount,
      notes: quotation.notes,
      created_by: params.createdBy,
    };

    return { quotation, purchaseOrderDraft };
  },
};
