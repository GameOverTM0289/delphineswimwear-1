import { NextResponse } from 'next/server';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { listSubscribers } from '@/lib/db/messages';

export async function GET() {
  if (!(await readAdminEmailFromCookie())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const subs = await listSubscribers();
  const header = 'Email,Status,Source,Subscribed,Confirmed,Unsubscribed';
  const escape = (s: string | null | undefined) =>
    s == null ? '' : `"${String(s).replace(/"/g, '""')}"`;
  const rows = subs.map((s: any) =>
    [
      escape(s.email),
      escape(s.status),
      escape(s.source),
      escape(s.subscribedAt.toISOString()),
      escape(s.confirmedAt?.toISOString() ?? null),
      escape(s.unsubscribedAt?.toISOString() ?? null),
    ].join(','),
  );
  const csv = [header, ...rows].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="delphine-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
