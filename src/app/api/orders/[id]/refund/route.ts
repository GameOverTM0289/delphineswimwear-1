import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/prisma';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { getOrderById, setOrderPaymentStatus } from '@/lib/db/orders';
import { refundPokOrder, cancelPokOrder, pokConfigured } from '@/lib/payment';
import { reconcileOrderPayment } from '@/lib/reconcile';
import { notifyOrderRefunded } from '@/lib/email/notifications';
import { adminLimiter, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * Admin-only: refund or cancel an order's POK payment.
 *
 * POST /api/orders/{id}/refund
 *   body: { reason?: string, notify?: boolean }
 *
 * Two distinct cases, decided by the order's TRUE status (we reconcile with
 * POK first so a "pending" order that was actually paid is handled correctly):
 *
 *   • PAID  → real REFUND. Money is returned via POK's refund endpoint, the
 *     order becomes payment:refunded / status:cancelled, and (unless opted
 *     out) the customer gets the refund email.
 *
 *   • NOT PAID (pending / failed) → CANCEL. No money ever moved, so there is
 *     nothing to refund. We cancel the open POK order so the customer can't
 *     still pay it, mark the order payment:failed / status:cancelled, and do
 *     NOT send a refund email (it would be misleading — they were never
 *     charged).
 *
 * This prevents the bug where cancelling an unpaid order incorrectly marked it
 * "refunded" and emailed the customer about a refund that never happened.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await readAdminEmailFromCookie();
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const limit = await adminLimiter.limit(`refund:${getClientIp(req)}`);
  if (!limit.success) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });
  }
  if (!pokConfigured()) {
    return NextResponse.json({ error: 'PAYMENTS_NOT_CONFIGURED' }, { status: 503 });
  }

  const { id } = await ctx.params;

  let body: { reason?: string; notify?: boolean } = {};
  try {
    body = (await req.json()) as { reason?: string; notify?: boolean };
  } catch {
    /* optional body */
  }

  let order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  if (!order.paymentRef) {
    return NextResponse.json(
      { error: 'NO_PAYMENT_REFERENCE', message: 'This order has no POK payment to act on.' },
      { status: 409 },
    );
  }
  if (order.paymentStatus === 'refunded') {
    return NextResponse.json(
      { error: 'ALREADY_REFUNDED', message: 'This order has already been refunded.' },
      { status: 409 },
    );
  }

  // Get the true status from POK before deciding refund vs cancel — a
  // "pending" order may actually be paid (a missed webhook), or genuinely
  // unpaid (e.g. a declined card).
  try {
    const rec = await reconcileOrderPayment(order);
    if (rec.changed) {
      const fresh = await getOrderById(id);
      if (fresh) order = fresh;
    }
  } catch {
    /* best-effort; fall back to stored status */
  }

  const reason = body.reason?.trim() || undefined;

  // After reconcile, paymentRef is still set (we never clear it). Capture it
  // as a non-null local for the POK calls below.
  const paymentRef = order.paymentRef;
  if (!paymentRef) {
    return NextResponse.json(
      { error: 'NO_PAYMENT_REFERENCE', message: 'This order has no POK payment to act on.' },
      { status: 409 },
    );
  }

  // ── PAID → real refund ──────────────────────────────────────────────
  if (order.paymentStatus === 'paid') {
    const result = await refundPokOrder(paymentRef, {
      reason: reason ?? 'Refunded by merchant',
    });
    if (!result.ok) {
      console.error('[orders/refund] POK refund failed:', result.error);
      return NextResponse.json(
        { error: 'POK_REFUND_FAILED', message: result.error ?? 'POK refused the refund.' },
        { status: 502 },
      );
    }

    const updated = await setOrderPaymentStatus(order.id, 'refunded', 'cancelled');

    let emailResult: 'sent' | 'failed' | 'skipped' = 'skipped';
    if (body.notify !== false) {
      try {
        const r = await notifyOrderRefunded(updated);
        emailResult = r && typeof r === 'object' && 'ok' in r && r.ok ? 'sent' : 'failed';
      } catch (e) {
        emailResult = 'failed';
        console.error('[orders/refund] refund email failed:', e);
      }
    }

    return NextResponse.json({ ok: true, action: 'refunded', order: updated, emailResult });
  }

  // ── NOT PAID → cancel the open order, no refund, no refund email ────
  // Tell POK to cancel so the customer can't still complete payment. We don't
  // hard-fail if POK can't cancel (e.g. it already expired) — we still close
  // the order on our side.
  const cancelRes = await cancelPokOrder(paymentRef, {
    reason: reason ?? 'Order cancelled (unpaid)',
  });
  if (!cancelRes.ok) {
    console.warn('[orders/refund] POK cancel returned an error (continuing):', cancelRes.error);
  }

  // Mark as failed + cancelled. NOT "refunded" — nothing was charged.
  const updated = await setOrderPaymentStatus(order.id, 'failed', 'cancelled');

  return NextResponse.json({
    ok: true,
    action: 'cancelled',
    order: updated,
    emailResult: 'skipped',
    message: 'Order was not paid, so it was cancelled (no refund needed, no email sent).',
  });
}
