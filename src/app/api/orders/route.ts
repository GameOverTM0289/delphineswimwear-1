import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/prisma';
import { OrderRequestSchema } from '@/lib/validation';
import { createOrder, InsufficientStockError } from '@/lib/db/orders';
import { notifyOrderPlaced } from '@/lib/email/notifications';
import { orderLimiter, getClientIp } from '@/lib/ratelimit';
import { createPaymentSession } from '@/lib/payment';

// Force Node runtime + give Vercel up to 15s for the email round-trip.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limit = await orderLimiter.limit(ip);
  if (!limit.success) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = OrderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION', issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }

  // Honeypot — silent success so bots don't probe the response shape.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true, orderNumber: 'HONEY-IGNORED' });
  }

  try {
    const order = await createOrder({ body: parsed.data });

    // Await the email (with a 6s timeout). Vercel serverless freezes
    // pending Promises once a response is returned, so fire-and-forget
    // is unreliable. Better to wait ~200-500ms and guarantee delivery.
    const emailPromise = notifyOrderPlaced({
      orderNumber: order.orderNumber,
      email: order.email,
      customerName: order.customerName,
      shippingMethod: order.shippingMethod,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      address1: order.address1,
      address2: order.address2,
      city: order.city,
      postalCode: order.postalCode,
      country: order.country,
      countryName: order.countryName,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      items: order.items.map((i) => ({
        productName: i.productName,
        size: i.size,
        color: i.color,
        priceCents: i.priceCents,
        quantity: i.quantity,
      })),
    });
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 6000));
    const result = await Promise.race([emailPromise, timeout]);
    if (result && typeof result === 'object' && 'timedOut' in result) {
      console.warn('[orders] order placed email timed out — order saved, email may still arrive');
    } else if (result && typeof result === 'object' && 'ok' in result && !result.ok) {
      console.error('[orders] order placed email failed:', result);
    }

    const payment = await createPaymentSession({
      orderNumber: order.orderNumber,
      amountCents: order.totalCents,
      currency: order.currency,
      customerEmail: order.email,
      customerName: order.customerName,
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      redirectUrl: payment.redirectUrl,
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_STOCK', details: err.details },
        { status: 409 },
      );
    }
    console.error('[orders] createOrder failed:', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
