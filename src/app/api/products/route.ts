import { NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/db/products';

export const runtime = 'nodejs';
// Cache aggressively — products change rarely.
export const revalidate = 300;

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ products });
  } catch (err) {
    console.error('[api/products]', err);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
