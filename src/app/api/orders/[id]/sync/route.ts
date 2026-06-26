import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/prisma';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { getOrderById } from '@/lib/db/orders';
import { reconcileOrderPayment } from '@/lib/reconcile';
import { pokConfigured } from '@/lib/payment';
import { adminLimiter, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * Admin: force-sync an order's payment status with POK.
 *
 * POST /api/orders/{id}/sync
 *
 * Calls reconcileOrderPayment(), which fetches the authoritative status from
 * POK and updates our order (sending the confirmation email if it just became
 * paid). Use this if the webhook didn't arrive and you want to pull the latest
 * status on demand.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await readAdminEmailFromCookie())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const limit = await adminLimiter.limit(`sync:${getClientIp(req)}`);
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
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  try {
    const result = await reconcileOrderPayment(order);
    return NextResponse.json({
      ok: true,
      checked: result.checked,
      paymentStatus: result.paymentStatus,
      changed: result.changed,
      note: result.note ?? null,
    });
  } catch (err) {
    console.error('[orders/sync]', err);
    return NextResponse.json({ error: 'SYNC_FAILED' }, { status: 500 });
  }
}
