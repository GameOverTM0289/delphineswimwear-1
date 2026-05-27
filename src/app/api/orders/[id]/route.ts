import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/prisma';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { OrderStatusUpdateSchema } from '@/lib/validation';
import { getOrderById, updateOrder } from '@/lib/db/orders';
import { notifyOrderStatusChange } from '@/lib/email/notifications';

// Force dynamic + node runtime — emails need the Resend client which
// uses Node APIs.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const EMAIL_TIMEOUT_MS = 6000;

/**
 * Race a promise against a timeout so a hung Resend call can't lock up
 * the admin save indefinitely. If the email is still in flight at 6s,
 * we return the response anyway and let the email continue best-effort.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | { timedOut: true }> {
  return Promise.race([
    p,
    new Promise<{ timedOut: true }>((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), ms),
    ),
  ]);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await readAdminEmailFromCookie();
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });
  const { id } = await ctx.params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await readAdminEmailFromCookie();
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }
  const parsed = OrderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = await ctx.params;
  try {
    const { before, after } = await updateOrder(id, parsed.data);
    const statusChanged = parsed.data.status && parsed.data.status !== before.status;
    const shouldNotify = parsed.data.notify !== false && statusChanged;

    let emailResult: 'sent' | 'failed' | 'timeout' | 'skipped' = 'skipped';

    if (shouldNotify && parsed.data.status) {
      // AWAIT the email instead of fire-and-forget. On Vercel
      // serverless, fire-and-forget Promises can be killed when the
      // response is returned and the function is frozen. Awaiting
      // adds ~200-500ms but guarantees the email is sent before we
      // declare success.
      try {
        const result = await withTimeout(
          notifyOrderStatusChange(after, parsed.data.status),
          EMAIL_TIMEOUT_MS,
        );
        if (result && typeof result === 'object' && 'timedOut' in result) {
          emailResult = 'timeout';
          console.warn(
            '[orders] status email timed out after',
            EMAIL_TIMEOUT_MS,
            'ms — Resend may be slow or DNS issue',
          );
        } else if (result && typeof result === 'object' && 'ok' in result && result.ok) {
          emailResult = 'sent';
        } else {
          emailResult = 'failed';
          console.error('[orders] status email failed:', result);
        }
      } catch (e) {
        emailResult = 'failed';
        console.error('[orders] status email threw:', e);
      }
    }

    return NextResponse.json({
      ok: true,
      order: after,
      emailQueued: Boolean(shouldNotify),
      emailResult,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    console.error('[orders] update failed:', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
