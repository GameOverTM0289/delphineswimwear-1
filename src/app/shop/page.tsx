import { Suspense } from 'react';
import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import CartDrawer from '@/components/cart/CartDrawer';
import Reveal from '@/components/ui/Reveal';
import { getAllProducts } from '@/lib/db/products';
import type { Category } from '@/lib/types';

interface Props {
  searchParams: Promise<{ cat?: string }>;
}

export const metadata = {
  title: 'Shop the Collection',
  description:
    'Browse the Mediterranean Summer ’26 collection — refined one-pieces and bikinis crafted for women who move freely.',
};

// Revalidate so admin product / stock changes appear within 30s.
export const revalidate = 30;

const FILTERS: { key: 'all' | Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'one-pieces', label: 'One Pieces' },
  { key: 'bikinis', label: 'Bikinis' },
];

export default async function ShopPage({ searchParams }: Props) {
  const all = await getAllProducts();
  const sp = await searchParams;
  const cat = (sp.cat ?? 'all') as 'all' | Category;

  const filtered =
    cat === 'all' ? all : all.filter((p) => p.category === cat);

  const counts = {
    all: all.length,
    'one-pieces': all.filter((p) => p.category === 'one-pieces').length,
    bikinis: all.filter((p) => p.category === 'bikinis').length,
  };

  return (
    <>
      <Announcement />
      <Nav />
      <main>
        {/* Compact header: title + filters in a single bar.
            Replaces the bulky PageHero so the products are visible
            without scrolling. */}
        <header className="shop-bar">
          <div className="shop-bar-l">
            <h1>
              Shop the <em>Collection</em>
            </h1>
            <span className="shop-bar-tag">Mediterranean Summer &rsquo;26</span>
          </div>
          <nav className="shop-bar-filters" aria-label="Filter products">
            {FILTERS.map((f) => {
              const href = f.key === 'all' ? '/shop' : `/shop?cat=${f.key}`;
              return (
                <Link
                  key={f.key}
                  href={href}
                  className={cat === f.key ? 'on' : ''}
                >
                  {f.label} <span className="cnt">({counts[f.key]})</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <Suspense>
          <div className="shop-grid">
            {filtered.length === 0 ? (
              <p className="shop-empty">No pieces in this category yet.</p>
            ) : (
              filtered.map((p) => (
                <Reveal key={p.id}>
                  <ProductCard product={p} />
                </Reveal>
              ))
            )}
          </div>
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
