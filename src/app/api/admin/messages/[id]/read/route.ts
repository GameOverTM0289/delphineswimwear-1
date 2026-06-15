import { NextResponse } from 'next/server';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { markContactRead } from '@/lib/db/messages';

/**
 * Dynamic-route handler. `params` is typed as a Promise — this is
 * the Next.js 15 signature, which Next.js 14 also accepts (a Promise
 * that resolves synchronously is fine to await). This makes the file
 * portable across runtimes and matches the type Vercel's typed-routes
 * validator generates.
 */
export async function PATCH(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await readAdminEmailFromCookie())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await markContactRead(id, true);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/messages] mark-read', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
