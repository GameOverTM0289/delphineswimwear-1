import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/prisma';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { setProductStock } from '@/lib/db/products';
import { StockUpdateSchema } from '@/lib/validation';

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (!(await readAdminEmailFromCookie())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });
  }
  const { slug } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = StockUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }
  try {
    const variants = await setProductStock(slug, parsed.data.stock);
    return NextResponse.json({ ok: true, variants });
  } catch (err) {
    console.error('[admin/products/stock]', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
