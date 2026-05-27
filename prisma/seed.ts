// Seeds the database with the 5 production pieces.
// Run with:  npm run db:seed
//
// Idempotent — safe to re-run. Removes products with slugs no longer
// in this list, and seeds default per-size stock for new variants
// without overwriting stock you've already set in admin.
//
// Colors (multi-color images) are NOT seeded here — they're attached
// at runtime from src/lib/data/products.ts so the design assets stay
// in code where they belong.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SIZES = ['S', 'M', 'L'];
const DEFAULT_STOCK = 10;

const PATH = '/assets/products';
const img = (n: number, color: string, view: 'front' | 'back') =>
  `${PATH}/product-${n}-${color}-${view}.webp`;

const products = [
  {
    slug: 'bikini-1',
    name: 'Bikini 1',
    subtitle: 'Bikini Set',
    category: 'bikinis',
    description: 'A refined silhouette in soft-touch fabric — designed for ease of movement and a quiet, considered feel against the skin. Cut and finished with care in our Mediterranean atelier.',
    priceCents: 18500,
    badge: 'Best Seller',
    mainImage: img(1, 'blue', 'front'),
    altImage: img(1, 'blue', 'back'),
    swatchHex: '#8FA8D4',
    featured: true,
    sortOrder: 1,
  },
  {
    slug: 'bikini-2',
    name: 'Bikini 2',
    subtitle: 'Bikini Set',
    category: 'bikinis',
    description: 'Effortless and assured. Soft handfeel, considered cut, made to move with you. Tailored and finished by hand at our Mediterranean atelier.',
    priceCents: 18500,
    badge: null,
    mainImage: img(2, 'red', 'front'),
    altImage: img(2, 'red', 'back'),
    swatchHex: '#C04A4A',
    featured: true,
    sortOrder: 2,
  },
  {
    slug: 'bikini-3',
    name: 'Bikini 3',
    subtitle: 'Bikini Set',
    category: 'bikinis',
    description: 'A confident silhouette in soft-touch fabric. Designed to feel weightless on the skin and last season after season. Hand-finished in the atelier.',
    priceCents: 19500,
    badge: null,
    mainImage: img(3, 'yellow', 'front'),
    altImage: img(3, 'yellow', 'back'),
    swatchHex: '#E8C572',
    featured: false,
    sortOrder: 3,
  },
  {
    slug: 'one-piece-1',
    name: 'One Piece 1',
    subtitle: 'One Piece',
    category: 'one-pieces',
    description: 'A refined one-piece in soft-touch fabric, sculpted for the body and finished with a quiet confidence. Cut and finished by hand at our Mediterranean atelier.',
    priceCents: 22000,
    badge: 'New',
    mainImage: img(4, 'red', 'front'),
    altImage: img(4, 'red', 'back'),
    swatchHex: '#C04A4A',
    featured: true,
    sortOrder: 4,
  },
  {
    slug: 'one-piece-2',
    name: 'One Piece 2',
    subtitle: 'One Piece',
    category: 'one-pieces',
    description: 'A timeless one-piece silhouette. Designed for ease of movement and a quiet, considered feel against the skin. Cut and finished with care in the atelier.',
    priceCents: 23000,
    badge: null,
    mainImage: img(5, 'yellow', 'front'),
    altImage: img(5, 'yellow', 'back'),
    swatchHex: '#E8C572',
    featured: false,
    sortOrder: 5,
  },
];

async function main() {
  const validSlugs = products.map((p) => p.slug);

  const stale = await prisma.product.findMany({
    where: { slug: { notIn: validSlugs } },
    select: { slug: true, name: true },
  });
  if (stale.length > 0) {
    console.log('🧹 Removing stale products:');
    stale.forEach((p) => console.log(`  − ${p.name} (${p.slug})`));
    await prisma.product.deleteMany({ where: { slug: { notIn: validSlugs } } });
  }

  console.log('🌱 Seeding products…');
  for (const p of products) {
    const row = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...p, sizes: SIZES },
      create: { ...p, sizes: SIZES },
    });

    await prisma.variant.deleteMany({
      where: { productId: row.id, size: { notIn: SIZES } },
    });

    for (const size of SIZES) {
      await prisma.variant.upsert({
        where: { productId_size: { productId: row.id, size } },
        update: {},
        create: { productId: row.id, size, stock: DEFAULT_STOCK },
      });
    }

    console.log(`  ✓ ${p.name}`);
  }
  console.log(`✓ Seeded ${products.length} products with stock. Database is in sync.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
