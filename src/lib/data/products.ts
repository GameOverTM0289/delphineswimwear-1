import { Product } from '@/lib/types';

/**
 * Static catalog. Five pieces — three bikinis, two one-piece swimsuits.
 *
 * Photo paths preserve the photographer's naming convention:
 *   `product-<n>-<color>-<view>.webp`
 * where view is "front" | "back" | "close up" (URL-encoded as %20).
 *
 * Color availability per product is dictated by what's in the photo
 * shoot. Product 1 now includes the recovered Red front/back assets.
 * All five products have full Blue + Yellow + Red options where the
 * photographer supplied matching views.
 *
 * This catalog also powers the database-backed code path: when a DB
 * row matches a slug here, its colors[] is attached at runtime by
 * lib/db/products.ts so admin/seed never needs to know about images.
 */

const PATH = '/assets/products';
const img = (n: number, color: string, view: 'front' | 'back' | 'close up') =>
  `${PATH}/product-${n}-${color}-${view.replace(' ', '%20')}.webp`;

// Shared color hex codes so all products use the exact same swatches.
const HEX = {
  blue: '#8FA8D4',
  red: '#C04A4A',
  yellow: '#E8C572',
};

export const STATIC_PRODUCTS: Product[] = [
  // ─── Bikini 1 ────────────────────────────────────────────────────
  // Available in Blue, Yellow, and the recovered Red front/back set.
  {
    id: 'static-bikini-1',
    slug: 'bikini-1',
    name: 'Bikini 1',
    subtitle: 'Bikini Set',
    category: 'bikinis',
    description:
      'A refined silhouette in soft-touch fabric — designed for ease of movement and a quiet, considered feel against the skin. Cut and finished with care in our Mediterranean atelier.',
    price: 185,
    priceCents: 18500,
    currency: 'EUR',
    badge: 'Best Seller',
    mainImage: img(1, 'blue', 'front'),
    altImage: img(1, 'blue', 'back'),
    swatchHex: HEX.blue,
    sizes: ['S', 'M', 'L'],
    featured: true,
    variants: [],
    colors: [
      {
        name: 'Blue',
        slug: 'blue',
        hex: HEX.blue,
        frontImage: img(1, 'blue', 'front'),
        backImage: img(1, 'blue', 'back'),
        closeUpImage: img(1, 'blue', 'close up'),
      },
      {
        name: 'Yellow',
        slug: 'yellow',
        hex: HEX.yellow,
        frontImage: img(1, 'yellow', 'front'),
        backImage: img(1, 'yellow', 'back'),
        closeUpImage: img(1, 'yellow', 'close up'),
      },
      {
        name: 'Red',
        slug: 'red',
        hex: HEX.red,
        frontImage: img(1, 'red', 'front'),
        backImage: img(1, 'red', 'back'),
      },
    ],
  },

  // ─── Bikini 2 ────────────────────────────────────────────────────
  // All three colors (Red, Blue, Yellow). No close-ups in this set.
  {
    id: 'static-bikini-2',
    slug: 'bikini-2',
    name: 'Bikini 2',
    subtitle: 'Bikini Set',
    category: 'bikinis',
    description:
      'Effortless and assured. Soft handfeel, considered cut, made to move with you. Tailored and finished by hand at our Mediterranean atelier.',
    price: 185,
    priceCents: 18500,
    currency: 'EUR',
    badge: null,
    mainImage: img(2, 'red', 'front'),
    altImage: img(2, 'red', 'back'),
    swatchHex: HEX.red,
    sizes: ['S', 'M', 'L'],
    featured: true,
    variants: [],
    colors: [
      { name: 'Red', slug: 'red', hex: HEX.red, frontImage: img(2, 'red', 'front'), backImage: img(2, 'red', 'back') },
      { name: 'Blue', slug: 'blue', hex: HEX.blue, frontImage: img(2, 'blue', 'front'), backImage: img(2, 'blue', 'back') },
      { name: 'Yellow', slug: 'yellow', hex: HEX.yellow, frontImage: img(2, 'yellow', 'front'), backImage: img(2, 'yellow', 'back') },
    ],
  },

  // ─── Bikini 3 ────────────────────────────────────────────────────
  // Full set with close-ups for every color.
  {
    id: 'static-bikini-3',
    slug: 'bikini-3',
    name: 'Bikini 3',
    subtitle: 'Bikini Set',
    category: 'bikinis',
    description:
      'A confident silhouette in soft-touch fabric. Designed to feel weightless on the skin and last season after season. Hand-finished in the atelier.',
    price: 195,
    priceCents: 19500,
    currency: 'EUR',
    badge: null,
    mainImage: img(3, 'yellow', 'front'),
    altImage: img(3, 'yellow', 'back'),
    swatchHex: HEX.yellow,
    sizes: ['S', 'M', 'L'],
    featured: false,
    variants: [],
    colors: [
      { name: 'Yellow', slug: 'yellow', hex: HEX.yellow, frontImage: img(3, 'yellow', 'front'), backImage: img(3, 'yellow', 'back'), closeUpImage: img(3, 'yellow', 'close up') },
      { name: 'Blue', slug: 'blue', hex: HEX.blue, frontImage: img(3, 'blue', 'front'), backImage: img(3, 'blue', 'back'), closeUpImage: img(3, 'blue', 'close up') },
      { name: 'Red', slug: 'red', hex: HEX.red, frontImage: img(3, 'red', 'front'), backImage: img(3, 'red', 'back'), closeUpImage: img(3, 'red', 'close up') },
    ],
  },

  // ─── One Piece 1 ─────────────────────────────────────────────────
  // All three colors, no close-ups.
  {
    id: 'static-one-piece-1',
    slug: 'one-piece-1',
    name: 'One Piece 1',
    subtitle: 'One Piece',
    category: 'one-pieces',
    description:
      'A refined one-piece in soft-touch fabric, sculpted for the body and finished with a quiet confidence. Cut and finished by hand at our Mediterranean atelier.',
    price: 220,
    priceCents: 22000,
    currency: 'EUR',
    badge: 'New',
    mainImage: img(4, 'red', 'front'),
    altImage: img(4, 'red', 'back'),
    swatchHex: HEX.red,
    sizes: ['S', 'M', 'L'],
    featured: true,
    variants: [],
    colors: [
      { name: 'Red', slug: 'red', hex: HEX.red, frontImage: img(4, 'red', 'front'), backImage: img(4, 'red', 'back') },
      { name: 'Blue', slug: 'blue', hex: HEX.blue, frontImage: img(4, 'blue', 'front'), backImage: img(4, 'blue', 'back') },
      { name: 'Yellow', slug: 'yellow', hex: HEX.yellow, frontImage: img(4, 'yellow', 'front'), backImage: img(4, 'yellow', 'back') },
    ],
  },

  // ─── One Piece 2 ─────────────────────────────────────────────────
  // All three colors. Yellow has a close-up; the others don't.
  {
    id: 'static-one-piece-2',
    slug: 'one-piece-2',
    name: 'One Piece 2',
    subtitle: 'One Piece',
    category: 'one-pieces',
    description:
      'A timeless one-piece silhouette. Designed for ease of movement and a quiet, considered feel against the skin. Cut and finished with care in the atelier.',
    price: 230,
    priceCents: 23000,
    currency: 'EUR',
    badge: null,
    mainImage: img(5, 'yellow', 'front'),
    altImage: img(5, 'yellow', 'back'),
    swatchHex: HEX.yellow,
    sizes: ['S', 'M', 'L'],
    featured: false,
    variants: [],
    colors: [
      { name: 'Yellow', slug: 'yellow', hex: HEX.yellow, frontImage: img(5, 'yellow', 'front'), backImage: img(5, 'yellow', 'back'), closeUpImage: img(5, 'yellow', 'close up') },
      { name: 'Blue', slug: 'blue', hex: HEX.blue, frontImage: img(5, 'blue', 'front'), backImage: img(5, 'blue', 'back') },
      { name: 'Red', slug: 'red', hex: HEX.red, frontImage: img(5, 'red', 'front'), backImage: img(5, 'red', 'back') },
    ],
  },
];
