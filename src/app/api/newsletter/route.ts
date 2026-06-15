import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;


import { hasDatabase } from '@/lib/prisma';

import { NewsletterSubscribeSchema } from '@/lib/validation';

import { subscribeNewsletter } from '@/lib/db/messages';

import { sendNewsletterConfirmation } from '@/lib/email/notifications';

import { newsletterLimiter, getClientIp } from '@/lib/ratelimit';


export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await newsletterLimiter.limit(ip);
  if (!limit.success) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = NewsletterSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  // Honeypot.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true, status: 'pending' });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    const result = await subscribeNewsletter({
      email: parsed.data.email,
      source: parsed.data.source ?? 'manual',
    });
    if (!result.alreadyActive && result.confirmToken) {
      const emailP = sendNewsletterConfirmation({
        email: result.email,
        confirmToken: result.confirmToken,
      });
      const timeoutP = new Promise((resolve) =>
        setTimeout(() => resolve({ timedOut: true }), 6000),
      );
      const r = await Promise.race([emailP, timeoutP]);
      if (r && typeof r === 'object' && 'timedOut' in r) {
        console.warn('[newsletter] confirm email timed out');
      } else if (r && typeof r === 'object' && 'ok' in r && !r.ok) {
        console.error('[newsletter] confirm email failed:', r);
      }
    }
    return NextResponse.json({
      ok: true,
      status: result.alreadyActive ? 'active' : 'pending',
    });
  } catch (err) {
    console.error('[newsletter] subscribe failed:', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
