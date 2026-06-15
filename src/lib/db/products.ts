// Product catalog DB layer. Always include variants so the UI can
// reflect per-size stock. When DATABASE_URL isn't configured the
// static fallback list is used.
//
// `colors` (multi-color images per product) is not yet a column on
// the Product table — for now we hydrate it from the matching slug in
// STATIC_PRODUCTS. This way the DB acts as the source of truth for
// stock, pricing, and copy, while the design assets (color swatches +
// front/back/close-up images) live in code where they belong.

import { prisma, hasDatabase } from '@/lib/prisma';
import { STATIC_PRODUCTS } from '@/lib/data/products';
import type { Product, Category } from '@/lib/types';

const STATIC_COLORS_BY_SLUG = new Map(
  STATIC_PRODUCTS.map((p) => [p.slug, p.colors]),
);

const VALID_SIZES = ['S', 'M', 'L'];

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    category: row.category as Category,
    description: row.description,
    price: row.priceCents / 100,
    priceCents: row.priceCents,
    currency: row.currency,
    badge: row.badge,
    mainImage: row.mainImage,
    altImage: row.altImage,
    swatchHex: row.swatchHex,
    sizes: (row.sizes ?? VALID_SIZES).filter((size: string) => VALID_SIZES.includes(size)),
    variants: (row.variants ?? [])
      .filter((v: any) => VALID_SIZES.includes(v.size))
      .map((v: any) => ({ size: v.size, stock: v.stock })),
    featured: row.featured,
    colors: STATIC_COLORS_BY_SLUG.get(row.slug),
  };
}

export async function getAllProducts(): Promise<Product[]> {
  if (!hasDatabase()) return STATIC_PRODUCTS;
  try {
    const rows = await prisma.product.findMany({
      where: { active: true },
      include: { variants: true },
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(rowToProduct);
  } catch (err) {
    console.error('[db/products] getAllProducts failed:', err);
    return STATIC_PRODUCTS;
  }
}

export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  if (!hasDatabase()) return STATIC_PRODUCTS.filter((p) => p.featured).slice(0, limit);
  try {
    const rows = await prisma.product.findMany({
      where: { active: true, featured: true },
      include: { variants: true },
      orderBy: { sortOrder: 'asc' },
      take: limit,
    });
    if (rows.length < limit) {
      const more = await prisma.product.findMany({
        where: { active: true, NOT: { featured: true } },
        include: { variants: true },
        orderBy: { sortOrder: 'asc' },
        take: limit - rows.length,
      });
      return [...rows, ...more].map(rowToProduct);
    }
    return rows.map(rowToProduct);
  } catch (err) {
    console.error('[db/products] getFeaturedProducts failed:', err);
    return STATIC_PRODUCTS.filter((p) => p.featured).slice(0, limit);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!hasDatabase()) return STATIC_PRODUCTS.find((p) => p.slug === slug) ?? null;
  try {
    const row = await prisma.product.findUnique({
      where: { slug },
      include: { variants: true },
    });
    if (!row || !row.active) return null;
    return rowToProduct(row);
  } catch (err) {
    console.error('[db/products] getProductBySlug failed:', err);
    return STATIC_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }
}

export async function listProductsForAdmin(): Promise<Product[]> {
  if (!hasDatabase()) return STATIC_PRODUCTS;
  const rows = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map(rowToProduct);
}

export async function updateProduct(slug: string, data: Record<string, unknown>) {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');
  return prisma.product.update({ where: { slug }, data });
}

export async function setProductStock(slug: string, stock: Record<string, number>) {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  await prisma.variant.deleteMany({
    where: { productId: product.id, size: { notIn: VALID_SIZES } },
  });
  const ops = Object.entries(stock)
    .filter(([size]) => VALID_SIZES.includes(size))
    .map(([size, qty]) =>
    prisma.variant.upsert({
      where: { productId_size: { productId: product.id, size } },
      update: { stock: qty },
      create: { productId: product.id, size, stock: qty },
    }),
  );
  await prisma.$transaction(ops);
  return prisma.variant.findMany({ where: { productId: product.id } });
}
