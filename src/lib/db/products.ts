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
import type { Product, Category, ColorOption } from '@/lib/types';

const STATIC_COLORS_BY_SLUG = new Map(
  STATIC_PRODUCTS.map((p) => [p.slug, p.colors]),
);

const VALID_SIZES = ['S', 'M', 'L'];

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'product'
  );
}

// Colors come from the DB JSON column for products created in the admin, and
// fall back to the static catalog (by slug) for the original seeded products.
function resolveColors(row: any): ColorOption[] | undefined {
  if (Array.isArray(row.colors) && row.colors.length > 0) {
    return (row.colors as ColorOption[]).map((c) => ({
      name: c.name,
      slug: c.slug || slugify(c.name),
      hex: c.hex,
      frontImage: c.frontImage,
      backImage: c.backImage,
      closeUpImage: c.closeUpImage || undefined,
    }));
  }
  return STATIC_COLORS_BY_SLUG.get(row.slug);
}

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
    colors: resolveColors(row),
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

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 2;
  // Cap the loop; collisions are rare.
  while (n < 100 && (await prisma.product.findUnique({ where: { slug } }))) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

// Color as it arrives from the admin form (slug optional — derived if absent).
export interface ColorInput {
  name: string;
  slug?: string;
  hex: string;
  frontImage: string;
  backImage: string;
  closeUpImage?: string;
}

export interface CreateProductInput {
  name: string;
  subtitle: string;
  description: string;
  category: Category;
  priceCents: number;
  badge?: string | null;
  featured?: boolean;
  sortOrder?: number;
  sizes: string[];
  stock?: Record<string, number>;
  colors: ColorInput[];
}

/**
 * Create a product from the admin. Derives the slug from the name, normalises
 * each color (slug + optional third image), seeds the card images + swatch
 * from the first color, and creates one Variant per chosen size with its
 * initial stock. Price is stored in cents — the single source of truth that
 * checkout + POK read back (never the browser).
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');

  const sizes = Array.from(new Set(input.sizes.filter((s) => VALID_SIZES.includes(s))));
  if (sizes.length === 0) throw new Error('NO_VALID_SIZES');
  if (!input.colors || input.colors.length === 0) throw new Error('NO_COLORS');

  const colors: ColorOption[] = input.colors.map((c) => ({
    name: c.name,
    slug: c.slug || slugify(c.name),
    hex: c.hex,
    frontImage: c.frontImage,
    backImage: c.backImage,
    closeUpImage: c.closeUpImage || undefined,
  }));
  const first = colors[0];

  const slug = await uniqueSlug(slugify(input.name));

  const created = await prisma.product.create({
    data: {
      slug,
      name: input.name,
      subtitle: input.subtitle,
      category: input.category,
      description: input.description,
      priceCents: input.priceCents,
      currency: 'EUR',
      badge: input.badge || null,
      mainImage: first.frontImage,
      altImage: first.backImage,
      swatchHex: first.hex,
      sizes,
      colors: colors as unknown as object,
      active: true,
      featured: input.featured ?? false,
      sortOrder: input.sortOrder ?? 0,
      variants: {
        create: sizes.map((size) => ({ size, stock: input.stock?.[size] ?? 0 })),
      },
    },
    include: { variants: true },
  });
  return rowToProduct(created);
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
