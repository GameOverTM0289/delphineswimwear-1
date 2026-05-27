import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/prisma';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { updateProduct } from '@/lib/db/products';
import { ProductUpdateSchema } from '@/lib/validation';

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
  const parsed = ProductUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const updated = await updateProduct(slug, parsed.data);
    return NextResponse.json({ ok: true, product: updated });
  } catch (err) {
    console.error('[admin/products] update failed:', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
