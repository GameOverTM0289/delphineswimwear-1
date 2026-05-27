import { NextResponse } from 'next/server';
import { prisma, hasDatabase } from '@/lib/prisma';
import { verifyPokWebhook } from '@/lib/payment';
import { alreadyProcessed, recordWebhook } from '@/lib/db/webhooks';

export const runtime = 'nodejs';

/**
 * Payment webhook stub. Currently treats payloads as POK-shaped:
 *   { event, orderNumber, reference, externalId? }
 *
 * When POK shares their actual signature scheme, replace verifyPokWebhook
 * in lib/payment.ts. To swap to Stripe quickly, write a similar route at
 * /api/payment/stripe that maps Stripe events onto the same updates here.
 */
export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get('x-pok-signature');
  if (!verifyPokWebhook(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderNumber = payload?.orderNumber;
  const event = payload?.event;
  const reference = payload?.reference ?? null;
  const externalId = payload?.externalId ?? `${orderNumber}-${event}-${reference ?? Date.now()}`;

  if (!orderNumber || !event) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Idempotency — networks retry webhooks.
  if (await alreadyProcessed(externalId)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let paymentStatus = order.paymentStatus;
    let status = order.status;
    if (event === 'payment.succeeded') {
      paymentStatus = 'paid';
      if (status === 'pending') status = 'processing';
    } else if (event === 'payment.failed') {
      paymentStatus = 'failed';
    } else if (event === 'payment.refunded') {
      paymentStatus = 'refunded';
    }

    await prisma.order.update({
      where: { orderNumber },
      data: { paymentStatus, status, paymentRef: reference ?? order.paymentRef },
    });

    await recordWebhook({
      externalId,
      provider: 'pok',
      eventType: event,
      payload,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[payment webhook]', err);
    return NextResponse.json({ error: 'Could not process webhook' }, { status: 500 });
  }
}
