import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;


import { confirmNewsletter } from '@/lib/db/messages';

import { sendNewsletterWelcome } from '@/lib/email/notifications';


export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }
  try {
    const sub = await confirmNewsletter(token);
    if (!sub) {
      return NextResponse.json({ error: 'TOKEN_NOT_FOUND' }, { status: 404 });
    }
    const emailP = sendNewsletterWelcome({
      email: sub.email,
      unsubscribeToken: sub.unsubscribeToken,
    });
    const timeoutP = new Promise((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), 6000),
    );
    await Promise.race([emailP, timeoutP]).catch((e) =>
      console.error('[newsletter] welcome failed:', e),
    );
    return NextResponse.json({ ok: true, email: sub.email });
  } catch (err) {
    console.error('[newsletter/confirm]', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
