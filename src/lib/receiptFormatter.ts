import type { Order, Organization, Payment } from '@/types/database';
import { formatCurrency } from '@/lib/calculations';

export function formatReceiptDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatOrganizationAddress(organization: Organization | null) {
  if (!organization) return '';

  return [
    organization.address_line1,
    organization.address_line2,
    [organization.city, organization.state, organization.postal_code].filter(Boolean).join(', '),
    organization.country,
  ]
    .filter(Boolean)
    .join(' • ');
}

export function formatPaymentLabel(payment: Payment) {
  if (payment.tender_type === 'card') {
    return payment.card_last_four
      ? `${payment.card_brand || 'Card'} •••• ${payment.card_last_four}`
      : payment.card_brand || 'Card';
  }

  if (payment.tender_type === 'other') {
    return payment.external_provider || 'Other';
  }

  return 'Cash';
}

export function getTotalTendered(order: Order) {
  return (order.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
}

export function getChangeGiven(order: Order) {
  return (order.payments || []).reduce((sum, payment) => sum + (payment.change_given || 0), 0);
}

export function getReceiptFooter(order: Order, organization: Organization | null) {
  if (organization?.phone) {
    return `Thank you. Questions? ${organization.phone}`;
  }
  return `Thank you for visiting ${organization?.name || 'CloudPos'}.`;
}

export function formatMoney(amount: number, currency?: string) {
  return formatCurrency(amount || 0, currency || 'USD');
}
