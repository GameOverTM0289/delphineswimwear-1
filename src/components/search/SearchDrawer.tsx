'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useUI } from '@/lib/store/ui';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

export default function SearchDrawer() {
  const open = useUI((s) => s.searchOpen);
  const close = useUI((s) => s.closeSearch);

  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fetch products once when the drawer first opens.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setProducts(Array.isArray(data?.products) ? data.products : []);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  // Auto-focus input when opening, lock body scroll.
  useEffect(() => {
    if (open && inputRef.current) {
      // small delay so the transition starts before focus shifts
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Reset the query when the drawer closes.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Product[];
    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.badge ?? '').toLowerCase().includes(q)
      );
    });
  }, [query, products]);

  const trimmed = query.trim();

  return (
    <>
      <div
        className={`search-overlay ${open ? 'on' : ''}`}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        className={`search-drawer ${open ? 'on' : ''}`}
        aria-hidden={!open}
        aria-label="Search"
      >
        <div className="search-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search the collection…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-close" onClick={close} type="button">
            Close
          </button>
        </div>

        <div className="search-body">
          {!trimmed ? (
            <>
              <div className="search-meta">Suggestions</div>
              <div className="search-suggestions">
                <Link href="/shop?cat=one-pieces" onClick={close}>
                  One Pieces
                </Link>
                <Link href="/shop?cat=bikinis" onClick={close}>
                  Bikinis
                </Link>
                <a onClick={() => setQuery('best seller')}>Best Sellers</a>
                <a onClick={() => setQuery('new')}>New In</a>
                <Link href="/lookbook" onClick={close}>
                  Lookbook
                </Link>
              </div>
            </>
          ) : results.length === 0 ? (
            <p className="search-empty">
              No pieces matching &ldquo;{trimmed}&rdquo; — try a different word.
            </p>
          ) : (
            <>
              <div className="search-meta">
                {results.length} {results.length === 1 ? 'Result' : 'Results'} for &ldquo;{trimmed}&rdquo;
              </div>
              <div className="search-results">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}`}
                    className="search-result"
                    onClick={close}
                  >
                    <div className="search-result-img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.mainImage} alt={p.name} />
                    </div>
                    <div className="search-result-name">{p.name}</div>
                    <div className="search-result-sub">{p.subtitle}</div>
                    <div className="search-result-price">
                      {formatPrice(p.price, p.currency)}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
