import { NextResponse } from 'next/server';
import { prisma, hasDatabase } from '@/lib/prisma';
import { readPokOrder, pokConfigured } from '@/lib/payment';
import { reconcileOrderPayment } from '@/lib/reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POK payment webhook (the order's webhookUrl).
 *
 * POK POSTs here when a payment is confirmed/captured. We do NOT trust the
 * body — POK doesn't publish a webhook-signing scheme. Instead the webhook is
 * just a *nudge*: we find our order from the POK id in the body, then call
 * reconcileOrderPayment(), which re-fetches the authoritative status from
 * POK's API and updates our order (and emails the customer) if needed.
 *
 * Because the same reconciliation also runs when the customer or an admin
 * loads the order page, the system is correct even if this webhook never
 * arrives — this handler only makes the update *faster* when it does.
 *
 * Idempotent and safe to call repeatedly.
 */
export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });
  }
  if (!pokConfigured()) {
    return NextResponse.json({ error: 'PAYMENTS_NOT_CONFIGURED' }, { status: 503 });
  }

  const raw = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const notified = readPokOrder(payload);
  if (!notified.pokOrderId && !notified.merchantCustomReference) {
    return NextResponse.json({ error: 'Missing order reference' }, { status: 400 });
  }

  try {
    // Find our order via the opaque POK id (matched to paymentRef), falling
    // back to our order number. The POK id is never exposed to the client, so
    // matching on it means a forged webhook can't point at someone's order.
    let order = notified.pokOrderId
      ? await prisma.order.findFirst({ where: { paymentRef: notified.pokOrderId } })
      : null;
    if (!order && notified.merchantCustomReference) {
      order = await prisma.order.findUnique({
        where: { orderNumber: notified.merchantCustomReference },
      });
    }
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Authoritative re-check + persist (+ email on first paid). The webhook
    // body is only used to locate the order; the truth comes from POK's API.
    const result = await reconcileOrderPayment(order as any);

    return NextResponse.json({ ok: true, status: result.paymentStatus, changed: result.changed });
  } catch (err) {
    console.error('[payment webhook]', err);
    return NextResponse.json({ error: 'Could not process webhook' }, { status: 500 });
  }
}
