import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/prisma';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { createProduct } from '@/lib/db/products';
import { ProductCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

// Create a product (admin only).
export async function POST(req: Request) {
  if (!(await readAdminEmailFromCookie())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ProductCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION', issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }

  try {
    const product = await createProduct(parsed.data);
    return NextResponse.json({ ok: true, product });
  } catch (err) {
    console.error('[admin/products] create failed:', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
