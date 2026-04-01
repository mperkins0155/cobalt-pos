// ============================================================
// CloudPos — Toast Helpers
// Pre-configured toast functions wrapping Sonner.
// Source pattern: Enterprise POS (toast-helpers.ts)
// Adapted for CloudPos POS events.
// ============================================================

import { toast } from 'sonner';

// ── Generic ──

export const showSuccess = (message: string) => toast.success(message);
export const showError = (message: string) => toast.error(message);
export const showWarning = (message: string) => toast.warning(message);
export const showInfo = (message: string) => toast.info(message);

// ── Order lifecycle ──

export const showOrderCreated = (orderId: string) =>
  toast.success(`Order #${orderId} created!`, {
    description: 'Sent to kitchen.',
  });

export const showOrderVoided = (orderId: string) =>
  toast.warning(`Order #${orderId} voided`, {
    description: 'Order has been cancelled.',
  });

// ── Payment ──

export const showPaymentComplete = (amount: string, method?: string) =>
  toast.success(`Payment of ${amount} received`, {
    description: method ? `Via ${method}` : undefined,
  });

export const showPaymentFailed = (reason?: string) =>
  toast.error('Payment failed', {
    description: reason || 'Please try again or use a different method.',
  });

// ── Kitchen / KDS ──

export const showOrderReady = (orderId: string) =>
  toast.success(`Order #${orderId} — all items ready!`, {
    description: 'Waiting for server pickup.',
  });

export const showItemBumped = (itemName: string) =>
  toast.success(`${itemName} — done`, { duration: 2000 });

// ── Table ──

export const showTableChanged = (from: string, to: string) =>
  toast.success(`Table changed: ${from} → ${to}`);

// ── Inventory ──

export const showStockUpdated = (itemName: string, newStock: number) =>
  toast.success(`${itemName} stock → ${newStock}`, { duration: 2000 });

export const showLowStockAlert = (itemName: string, remaining: number) =>
  toast.warning(`Low stock: ${itemName}`, {
    description: `Only ${remaining} remaining.`,
    duration: 5000,
  });

// ── Staff ──

export const showClockIn = (name: string) =>
  toast.success(`${name} clocked in`);

export const showClockOut = (name: string) =>
  toast.info(`${name} clocked out`);

// ── Refund ──

export const showRefundProcessed = (orderId: string, amount: string) =>
  toast.success(`Refund of ${amount} processed`, {
    description: `Order #${orderId}`,
  });

// ── Generic action with undo ──

export const showActionWithUndo = (
  message: string,
  onUndo: () => void,
  duration = 5000
) =>
  toast(message, {
    duration,
    action: {
      label: 'Undo',
      onClick: onUndo,
    },
  });
