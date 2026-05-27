import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;


import { hasDatabase } from '@/lib/prisma';

import { ContactRequestSchema } from '@/lib/validation';

import { recordContactMessage } from '@/lib/db/messages';

import { notifyContactReceived } from '@/lib/email/notifications';

import { contactLimiter, getClientIp, sha256 } from '@/lib/ratelimit';


export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await contactLimiter.limit(ip);
  if (!limit.success) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = ContactRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 400 });
  }

  // Honeypot — pretend success so bots don't learn the form is protected.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    await recordContactMessage({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
      ipHash: sha256(ip),
    });
    // Await with timeout. Customers see "your message is sent" only
    // after the admin notification email is dispatched (or times out).
    const emailP = notifyContactReceived({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    const timeoutP = new Promise((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), 6000),
    );
    const result = await Promise.race([emailP, timeoutP]);
    if (result && typeof result === 'object' && 'timedOut' in result) {
      console.warn('[contact] notify timed out');
    } else if (result && typeof result === 'object' && 'ok' in result && !result.ok) {
      console.error('[contact] notify failed:', result);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[contact] save failed:', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
