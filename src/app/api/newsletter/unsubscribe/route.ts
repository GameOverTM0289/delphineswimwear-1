import { NextResponse } from 'next/server';
import { unsubscribeNewsletter } from '@/lib/db/messages';

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }
  try {
    const sub = await unsubscribeNewsletter(token);
    if (!sub) return NextResponse.json({ error: 'TOKEN_NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ ok: true, email: sub.email });
  } catch (err) {
    console.error('[newsletter/unsubscribe]', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
