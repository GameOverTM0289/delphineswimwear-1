import type { MetadataRoute } from 'next';
import { STATIC_PRODUCTS } from '@/lib/data/products';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delphineswimwear.com').replace(
  /\/$/,
  '',
);

// Public, indexable routes only — no /admin, /api, /checkout or /order pages.
const STATIC_ROUTES = [
  '',
  '/shop',
  '/lookbook',
  '/story',
  '/contact',
  '/faq',
  '/shipping',
  '/returns',
  '/privacy',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE}${path}` || `${SITE}/`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  const products: MetadataRoute.Sitemap = STATIC_PRODUCTS.map((p) => ({
    url: `${SITE}/product/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...pages, ...products];
}
