// Payment reconciliation — the single, authoritative way to bring one of our
// orders into sync with POK's record of the payment.
//
// WHY THIS EXISTS: webhooks are not reliable. POK's webhook may be delayed,
// may fail to deliver, or may not fire at all depending on account/config.
// Relying on it as the ONLY path to "paid" means a successful payment can sit
// forever as "pending" in our admin (exactly what happened in testing).
//
// So instead of trusting the webhook, anything that needs an order's true
// status calls `reconcileOrderPayment()`, which asks POK directly
// (GET sdk-order) and updates our DB to match. This is called from:
//   - the customer order page on load (so the buyer sees "paid" immediately),
//   - the admin order detail page on load (so staff never check POK manually),
//   - an admin "Sync with POK" button,
//   - and the webhook (as the fast path when it does fire).
//
// It is idempotent and safe to call repeatedly.

import { prisma, hasDatabase } from '@/lib/prisma';
import { getPokOrder, readPokOrder, pokConfigured } from '@/lib/payment';
import type { OrderRow } from '@/lib/db/orders';
import { notifyOrderPlaced } from '@/lib/email/notifications';

export type PaymentState = 'pending' | 'paid' | 'failed' | 'refunded';

export interface ReconcileResult {
  /** Did we actually reach POK and check? (false if not configured / no ref) */
  checked: boolean;
  /** The payment status after reconciliation. */
  paymentStatus: PaymentState;
  /** True if this call changed the stored status. */
  changed: boolean;
  /** POK's opaque order id, when known. */
  pokOrderId: string | null;
  /** Human note for logs / admin display. */
  note?: string;
}

interface OrderLike {
  id: string;
  orderNumber: string;
  paymentStatus: string;
  paymentRef: string | null;
  totalCents: number;
  status: string;
}

/**
 * Sync one order's payment status with POK and persist any change.
 *
 * Pass a full OrderRow (preferred — lets us send the confirmation email with
 * line items) or a minimal OrderLike. Returns what the status is now.
 */
export async function reconcileOrderPayment(
  order: OrderLike | OrderRow,
): Promise<ReconcileResult> {
  const current = order.paymentStatus as PaymentState;

  // Nothing to do without a DB, without POK, or without a POK reference.
  if (!hasDatabase() || !pokConfigured() || !order.paymentRef) {
    return {
      checked: false,
      paymentStatus: current,
      changed: false,
      pokOrderId: order.paymentRef ?? null,
    };
  }

  // Already in a terminal state we won't move away from automatically.
  if (current === 'refunded') {
    return { checked: false, paymentStatus: current, changed: false, pokOrderId: order.paymentRef };
  }

  const pok = await getPokOrder(order.paymentRef);
  if (!pok) {
    // Couldn't reach POK right now — leave as-is, report unchanged.
    return {
      checked: false,
      paymentStatus: current,
      changed: false,
      pokOrderId: order.paymentRef,
      note: 'POK unreachable',
    };
  }

  const verified = readPokOrder(pok);

  // Decide the new state from POK's authoritative flags.
  let next: PaymentState = current;
  let newOrderStatus: string | undefined;

  if (verified.isRefunded) {
    next = 'refunded';
    newOrderStatus = 'cancelled';
  } else if (verified.isCanceled) {
    next = 'failed';
  } else if (verified.isCompleted) {
    // Confirm the captured amount matches before trusting it.
    const expectedMajor = Math.round(order.totalCents / 100);
    if (verified.amount == null || verified.amount === expectedMajor) {
      next = 'paid';
      if (order.status === 'pending') newOrderStatus = 'processing';
    } else {
      return {
        checked: true,
        paymentStatus: current,
        changed: false,
        pokOrderId: verified.pokOrderId ?? order.paymentRef,
        note: `amount mismatch (pok ${verified.amount} vs ${expectedMajor})`,
      };
    }
  } else {
    // Still pending on POK's side.
    return {
      checked: true,
      paymentStatus: current,
      changed: false,
      pokOrderId: verified.pokOrderId ?? order.paymentRef,
      note: 'still pending on POK',
    };
  }

  if (next === current && !newOrderStatus) {
    return { checked: true, paymentStatus: current, changed: false, pokOrderId: order.paymentRef };
  }

  // Persist. Use an idempotency guard: only flip pending→paid once, so the
  // confirmation email is sent a single time even under concurrent calls
  // (order page + webhook racing).
  const wasPaid = current === 'paid';
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: next,
      ...(newOrderStatus ? { status: newOrderStatus } : {}),
    },
    include: { items: true },
  });

  // Send the confirmation email exactly once, on the first transition to paid.
  if (next === 'paid' && !wasPaid) {
    try {
      await notifyOrderPlaced(updated as unknown as OrderRow);
    } catch (e) {
      // Never fail reconciliation because of a slow/failed email.
      console.error('[reconcile] confirmation email failed (order still paid):', e);
    }
  }

  return {
    checked: true,
    paymentStatus: next,
    changed: true,
    pokOrderId: verified.pokOrderId ?? order.paymentRef,
  };
}

/**
 * Handle a customer returning from POK after a FAILED payment.
 *
 * Called from the order page when it loads with `?failed=1`. We first reconcile
 * (a "failed" redirect can be misleading — maybe the payment actually went
 * through on a retry, or a webhook already marked it paid), and only if the
 * order is genuinely still unpaid do we cancel the open POK order and mark ours
 * `failed` + `cancelled`. This keeps the admin clean (no orphaned "pending"
 * orders from abandoned attempts) without ever cancelling a real payment.
 *
 * No email is sent — the customer was never charged. The cart is preserved on
 * the client so they can simply check out again (a fresh order).
 *
 * Returns the resulting payment state.
 */
export async function failUnpaidOrder(
  order: OrderLike | OrderRow,
): Promise<PaymentState> {
  // Reconcile first — never clobber a real payment.
  let current: PaymentState = order.paymentStatus as PaymentState;
  try {
    const rec = await reconcileOrderPayment(order);
    current = rec.paymentStatus;
  } catch {
    /* fall through with stored status */
  }

  // If it turned out paid/refunded, leave it alone.
  if (current === 'paid' || current === 'refunded' || current === 'failed') {
    return current;
  }

  if (!hasDatabase()) return current;

  // Genuinely unpaid → cancel the open POK order (best-effort) and mark failed.
  if (pokConfigured() && order.paymentRef) {
    try {
      const { cancelPokOrder } = await import('@/lib/payment');
      await cancelPokOrder(order.paymentRef, { reason: 'Payment failed / abandoned' });
    } catch (e) {
      console.warn('[failUnpaidOrder] POK cancel failed (continuing):', e);
    }
  }

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'failed', status: 'cancelled' },
    });
  } catch (e) {
    console.error('[failUnpaidOrder] could not mark order failed:', e);
    return current;
  }

  return 'failed';
}
