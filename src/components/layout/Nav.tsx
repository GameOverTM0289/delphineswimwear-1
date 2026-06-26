'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useCart } from '@/lib/store/cart';
import { useUI } from '@/lib/store/ui';
import SearchDrawer from '@/components/search/SearchDrawer';

// `cat` is the category query param a link points at. For the three
// shop links we disambiguate the active underline by category so only
// the clicked one is highlighted:
//   - One Pieces  → /shop?cat=one-pieces
//   - Bikinis     → /shop?cat=bikinis
//   - Collection  → /shop (no cat, i.e. "all")
const links: Array<{ href: string; label: string; match: string; cat?: string }> = [
  { href: '/shop?cat=one-pieces', label: 'One Pieces', match: '/shop', cat: 'one-pieces' },
  { href: '/shop?cat=bikinis', label: 'Bikinis', match: '/shop', cat: 'bikinis' },
  { href: '/shop', label: 'Collection', match: '/shop', cat: '' },
  { href: '/lookbook', label: 'Lookbook', match: '/lookbook' },
  { href: '/story', label: 'Our Story', match: '/story' },
  { href: '/contact', label: 'Contact', match: '/contact' },
];

/**
 * The desktop nav links. Split into its own component because it reads
 * `useSearchParams()` (to highlight only the active category), which must
 * live inside a <Suspense> boundary in the app router.
 */
function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCat = searchParams.get('cat') ?? '';

  const isActive = (l: { match: string; cat?: string }) => {
    if (l.match === '/shop') {
      // Product detail pages carry no category — highlight none of the
      // shop links there rather than arbitrarily picking one.
      if (pathname.startsWith('/product')) return false;
      if (!pathname.startsWith('/shop')) return false;
      return (l.cat ?? '') === currentCat;
    }
    return pathname === l.match;
  };

  return (
    <ul className="nav-c">
      {links.map((l) => {
        const active = isActive(l);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const open = useCart((s) => s.open);
  const items = useCart((s) => s.items);
  const openSearch = useUI((s) => s.openSearch);

  useEffect(() => {
    // hydrate cart store on client
    useCart.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const cartCount = hydrated
    ? items.reduce((acc, it) => acc + it.quantity, 0)
    : 0;

  return (
    <>
      <nav className="site-nav">
        <Link href="/" className="nav-logo" aria-label="Delphine — Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/delphine-logo.png" alt="Delphine" />
        </Link>

        <Suspense fallback={<ul className="nav-c" />}>
          <NavLinks />
        </Suspense>

        <div className="nav-r">
          <button
            type="button"
            className="search-link"
            onClick={openSearch}
            aria-label="Search"
          >
            Search
          </button>
          <button className="bag" onClick={open} aria-label="Open cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M5 8h14l-1.5 12h-11L5 8z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            Bag ({cartCount})
          </button>
          <button
            className="nav-burger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* mobile drawer */}
      <div
        className={`mob-overlay ${mobileOpen ? 'on' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside className={`mob-drawer ${mobileOpen ? 'on' : ''}`}>
        <div className="mob-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/delphine-logo.png" alt="Delphine" />
          <button className="mob-close" onClick={() => setMobileOpen(false)}>
            Close
          </button>
        </div>
        <ul className="mob-links">
          <li>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openSearch();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--serif)',
                fontSize: 24,
                fontWeight: 400,
                cursor: 'pointer',
                padding: 0,
                color: 'var(--k)',
              }}
            >
              Search
            </button>
          </li>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* search drawer (rendered globally via the nav) */}
      <SearchDrawer />
    </>
  );
}
