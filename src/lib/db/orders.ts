// Orders DB layer. Implements the transactional flow:
//   1. Verify per-size stock for every line item
//   2. Decrement stock atomically
//   3. Insert the order + items
//   4. Build a clean OrderRow used by emails + the admin page

import { prisma, hasDatabase } from '@/lib/prisma';
import { findCountry } from '@/lib/data/countries';
import { quote } from '@/lib/pricing';
import { STATIC_PRODUCTS } from '@/lib/data/products';
import type { OrderRequest } from '@/lib/validation';
import type { OrderStatus, ShippingMethod } from '@/lib/types';

// Catalog price fallback for any slug not present in the DB. The DB row is
// always preferred; this just guarantees we can resolve a trusted price even
// for static-only products.
const STATIC_PRICE_CENTS_BY_SLUG = new Map<string, number>(
  STATIC_PRODUCTS.map((p) => [p.slug, p.priceCents]),
);

export interface OrderRow {
  id: string;
  orderNumber: string;
  email: string;
  customerName: string;
  phone: string | null;
  address1: string;
  address2: string | null;
  city: string;
  postalCode: string;
  country: string;
  countryName: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  taxRate: number;
  totalCents: number;
  currency: string;
  shippingMethod: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  paymentRef: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  notes: string | null;
  createdAt: Date;
  items: Array<{
    id: string;
    productSlug: string;
    productName: string;
    size: string;
    color: string;
    priceCents: number;
    quantity: number;
    image: string;
  }>;
}

export class InsufficientStockError extends Error {
  details: Array<{ slug: string; size: string; requested: number; available: number }>;
  constructor(details: InsufficientStockError['details']) {
    super('INSUFFICIENT_STOCK');
    this.details = details;
    this.name = 'InsufficientStockError';
  }
}

// Thrown when an order line references a product we can't price from the
// catalog (DB or static). Treated as a 400 — the cart is stale or tampered.
export class UnknownProductError extends Error {
  slugs: string[];
  constructor(slugs: string[]) {
    super('UNKNOWN_PRODUCT');
    this.slugs = slugs;
    this.name = 'UnknownProductError';
  }
}

function rowToOrder(o: any): OrderRow {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    email: o.email,
    customerName: o.customerName,
    phone: o.phone,
    address1: o.address1,
    address2: o.address2,
    city: o.city,
    postalCode: o.postalCode,
    country: o.country,
    countryName: o.countryName,
    subtotalCents: o.subtotalCents,
    shippingCents: o.shippingCents,
    taxCents: o.taxCents,
    taxRate: o.taxRate,
    totalCents: o.totalCents,
    currency: o.currency,
    shippingMethod: o.shippingMethod,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    paymentRef: o.paymentRef,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    notes: o.notes,
    createdAt: o.createdAt,
    items: (o.items ?? []).map((i: any) => ({
      id: i.id,
      productSlug: i.productSlug,
      productName: i.productName,
      size: i.size,
      color: i.color,
      priceCents: i.priceCents,
      quantity: i.quantity,
      image: i.image,
    })),
  };
}

interface CreateOrderArgs {
  body: OrderRequest;
}

export async function createOrder({ body }: CreateOrderArgs): Promise<OrderRow> {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');

  const country = findCountry(body.shipping.country);
  if (!country) throw new Error('INVALID_COUNTRY');

  const customerName = `${body.shipping.firstName} ${body.shipping.lastName}`.trim();
  const phoneFull = `+${findCountry(body.shipping.phoneCountry)?.dial ?? ''}${body.shipping.phone}`;

  const created = await prisma.$transaction(async (tx: any) => {
    // Lock the variant rows for the items being ordered, verify stock.
    const productSlugs = Array.from(new Set(body.items.map((i) => i.slug)));
    const products = await tx.product.findMany({
      where: { slug: { in: productSlugs } },
      include: { variants: true },
    });
    const productBySlug = new Map<string, any>(
      products.map((p: any) => [p.slug, p]),
    );

    // ── Authoritative pricing ──────────────────────────────────────────
    // NEVER trust the price the browser sent (body.items[].price). Resolve
    // every line price from the catalog — DB row first, static catalog as
    // fallback — and reject any slug we can't price. This is what prevents
    // a tampered cart from checking out a €220 piece for €0.01.
    const priceCentsBySlug = new Map<string, number>();
    const unknownSlugs: string[] = [];
    for (const slug of productSlugs) {
      const cents =
        productBySlug.get(slug)?.priceCents ?? STATIC_PRICE_CENTS_BY_SLUG.get(slug);
      if (typeof cents !== 'number') unknownSlugs.push(slug);
      else priceCentsBySlug.set(slug, cents);
    }
    if (unknownSlugs.length > 0) throw new UnknownProductError(unknownSlugs);

    const itemsSubtotalCents = body.items.reduce(
      (sum, i) => sum + (priceCentsBySlug.get(i.slug) ?? 0) * i.quantity,
      0,
    );
    const q = quote({
      itemsSubtotalCents,
      countryCode: body.shipping.country,
      shippingMethod: body.shippingMethod as ShippingMethod,
    });

    const insufficient: InsufficientStockError['details'] = [];
    const stockOps: Promise<unknown>[] = [];

    for (const item of body.items) {
      const product = productBySlug.get(item.slug);
      if (!product) continue; // guest items without DB products: no stock check possible
      const variant = product.variants.find((v: any) => v.size === item.size);
      if (!variant) continue; // stock not tracked for this size yet
      if (variant.stock < item.quantity) {
        insufficient.push({
          slug: item.slug,
          size: item.size,
          requested: item.quantity,
          available: variant.stock,
        });
      } else {
        stockOps.push(
          tx.variant.update({
            where: { id: variant.id },
            data: { stock: { decrement: item.quantity } },
          }),
        );
      }
    }

    if (insufficient.length > 0) {
      throw new InsufficientStockError(insufficient);
    }
    await Promise.all(stockOps);

    // Reserve a sequence by inserting first; orderNumber filled in via update
    // is unnecessary because Prisma's autoincrement seq is set on insert.
    const order = await tx.order.create({
      data: {
        // placeholder — replaced post-create
        orderNumber: 'PENDING',
        email: body.shipping.email.toLowerCase().trim(),
        customerName,
        phone: phoneFull,
        address1: body.shipping.address1,
        address2: body.shipping.address2 || null,
        city: body.shipping.city,
        postalCode: body.shipping.postalCode,
        country: body.shipping.country,
        countryName: country.name,
        subtotalCents: q.subtotalCents,
        shippingCents: q.shippingCents,
        taxCents: q.taxCents,
        taxRate: q.taxRate,
        totalCents: q.totalCents,
        currency: 'EUR',
        shippingMethod: body.shippingMethod,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'pok',
        items: {
          create: body.items.map((i) => ({
            productId: productBySlug.get(i.slug)?.id ?? null,
            productSlug: i.slug,
            productName: i.name,
            size: i.size,
            color: i.color,
            priceCents: priceCentsBySlug.get(i.slug) ?? 0,
            quantity: i.quantity,
            image: i.image,
          })),
        },
      },
      include: { items: true },
    });

    const year = new Date().getFullYear();
    const orderNumber = `DEL-${year}-${String(order.seq).padStart(4, '0')}`;
    const finalOrder = await tx.order.update({
      where: { id: order.id },
      data: { orderNumber },
      include: { items: true },
    });
    return finalOrder;
  });

  return rowToOrder(created);
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  if (!hasDatabase()) return null;
  const o = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  return o ? rowToOrder(o) : null;
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderRow | null> {
  if (!hasDatabase()) return null;
  const o = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  return o ? rowToOrder(o) : null;
}

export async function listOrders(opts: {
  status?: OrderStatus;
  search?: string;
  limit?: number;
} = {}): Promise<OrderRow[]> {
  if (!hasDatabase()) return [];
  const where: any = {};
  if (opts.status) where.status = opts.status;
  if (opts.search) {
    const s = opts.search.trim();
    where.OR = [
      { orderNumber: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { customerName: { contains: s, mode: 'insensitive' } },
    ];
  }
  const rows = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 200,
  });
  return rows.map(rowToOrder);
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  notes?: string | null;
}

export async function updateOrder(
  id: string,
  input: UpdateOrderInput,
): Promise<{ before: OrderRow; after: OrderRow }> {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');
  const before = await getOrderById(id);
  if (!before) throw new Error('ORDER_NOT_FOUND');
  const after = await prisma.order.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber || null } : {}),
      ...(input.trackingUrl !== undefined ? { trackingUrl: input.trackingUrl || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    },
    include: { items: true },
  });
  return { before, after: rowToOrder(after) };
}

export async function getOrderMetrics() {
  if (!hasDatabase()) return null;
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now);
  startOfMonth.setDate(now.getDate() - 30);

  const [today, week, month, total, pending, processing] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfWeek } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'pending' } }),
    prisma.order.count({ where: { status: 'processing' } }),
  ]);

  return {
    today: { revenue: (today._sum.totalCents ?? 0) / 100, count: today._count },
    week: { revenue: (week._sum.totalCents ?? 0) / 100, count: week._count },
    month: { revenue: (month._sum.totalCents ?? 0) / 100, count: month._count },
    total,
    pending,
    processing,
  };
}
