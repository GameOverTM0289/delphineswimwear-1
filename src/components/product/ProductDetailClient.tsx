'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { useCart } from '@/lib/store/cart';
import type { Product, ColorOption } from '@/lib/types';

interface Props {
  product: Product;
}

const LOW_STOCK_THRESHOLD = 3;
const SWIPE_THRESHOLD = 42;

/**
 * Unified product detail. Owns selected color + size, swaps gallery
 * imagery when a swatch is picked, and adds the correct
 * product + color + size to the cart on submit.
 *
 * If a product has no `colors` array (legacy or DB row not yet
 * hydrated), we fall back to a single virtual color built from
 * mainImage / altImage / swatchHex / subtitle so the UI still works.
 */
export default function ProductDetailClient({ product }: Props) {
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);

  // ── Color resolution ──────────────────────────────────────────────
  const colors = useMemo<ColorOption[]>(() => {
    if (product.colors && product.colors.length > 0) return product.colors;
    const fallbackName = product.subtitle.includes('·')
      ? product.subtitle.split('·').pop()?.trim() ?? 'Default'
      : 'Default';
    return [
      {
        name: fallbackName,
        slug: fallbackName.toLowerCase().replace(/\s+/g, '-'),
        hex: product.swatchHex,
        frontImage: product.mainImage,
        backImage: product.altImage,
      },
    ];
  }, [product]);

  const [color, setColor] = useState<ColorOption>(colors[0]);

  // Reset color selection if `product` changes (different slug).
  useEffect(() => {
    setColor(colors[0]);
  }, [colors]);

  // ── Size + stock ──────────────────────────────────────────────────
  const stockBySize = useMemo(() => {
    const map: Record<string, number> = {};
    product.variants.forEach((v) => {
      map[v.size] = v.stock;
    });
    return map;
  }, [product.variants]);

  const stockTracked = product.variants.length > 0;

  const defaultSize = useMemo(() => {
    if (!stockTracked) return product.sizes[1] ?? product.sizes[0] ?? 'M';
    const first = product.sizes.find((s) => (stockBySize[s] ?? 0) > 0);
    return first ?? product.sizes[0] ?? 'M';
  }, [product.sizes, stockTracked, stockBySize]);

  const [size, setSize] = useState<string>(defaultSize);

  const stockForSelected = stockTracked ? stockBySize[size] ?? 0 : Infinity;
  const isOutOfStock = stockTracked && stockForSelected <= 0;
  const isLowStock =
    stockTracked && stockForSelected > 0 && stockForSelected <= LOW_STOCK_THRESHOLD;

  // ── Gallery (front, back, optional close-up) ──────────────────────
  const galleryImages = useMemo(() => {
    const imgs = [color.frontImage, color.backImage];
    if (color.closeUpImage) imgs.push(color.closeUpImage);
    return imgs;
  }, [color]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const galleryTouchStart = useRef<number | null>(null);
  const lightboxTouchStart = useRef<number | null>(null);

  const wrapIndex = useCallback(
    (idx: number) => {
      if (galleryImages.length === 0) return 0;
      return (idx + galleryImages.length) % galleryImages.length;
    },
    [galleryImages.length],
  );

  const showImage = useCallback(
    (idx: number) => {
      setActiveIdx(wrapIndex(idx));
    },
    [wrapIndex],
  );

  const showPrevious = useCallback(() => {
    setActiveIdx((idx) => wrapIndex(idx - 1));
  }, [wrapIndex]);

  const showNext = useCallback(() => {
    setActiveIdx((idx) => wrapIndex(idx + 1));
  }, [wrapIndex]);

  const showPreviousLightbox = useCallback(() => {
    setLightboxIdx((idx) => wrapIndex(idx - 1));
  }, [wrapIndex]);

  const showNextLightbox = useCallback(() => {
    setLightboxIdx((idx) => wrapIndex(idx + 1));
  }, [wrapIndex]);

  // Reset to first image when color changes.
  useEffect(() => {
    setActiveIdx(0);
    setLightboxIdx(0);
    setLightboxOpen(false);
  }, [color]);

  // Auto-rotate gallery (paused on hover/lightbox).
  useEffect(() => {
    if (galleryImages.length <= 1 || paused || lightboxOpen) return;
    timer.current = setInterval(() => {
      setActiveIdx((a) => (a + 1) % galleryImages.length);
    }, 4500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [galleryImages.length, paused, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft') showPreviousLightbox();
      if (event.key === 'ArrowRight') showNextLightbox();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen, showNextLightbox, showPreviousLightbox]);

  // ── Add to cart ───────────────────────────────────────────────────
  const onAdd = () => {
    if (isOutOfStock) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: color.frontImage,
      size,
      color: color.name,
      price: product.price,
      quantity: 1,
    });
    open();
  };

  const openLightbox = () => {
    setPaused(true);
    setLightboxIdx(activeIdx);
    setLightboxOpen(true);
  };

  const handleGalleryTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    galleryTouchStart.current = event.touches[0]?.clientX ?? null;
  };

  const handleGalleryTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (galleryTouchStart.current === null) return;
    const diff = galleryTouchStart.current - (event.changedTouches[0]?.clientX ?? 0);
    galleryTouchStart.current = null;
    if (Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff > 0) showNext();
    else showPrevious();
  };

  const handleLightboxTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    lightboxTouchStart.current = event.touches[0]?.clientX ?? null;
  };

  const handleLightboxTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (lightboxTouchStart.current === null) return;
    const diff = lightboxTouchStart.current - (event.changedTouches[0]?.clientX ?? 0);
    lightboxTouchStart.current = null;
    if (Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff > 0) showNextLightbox();
    else showPreviousLightbox();
  };

  return (
    <>
      {/* Gallery — pinned to left column by .product-detail grid */}
      <div
        className={`pd-gallery pd-gallery--${product.slug}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onClick={openLightbox}
        onTouchStart={handleGalleryTouchStart}
        onTouchEnd={handleGalleryTouchEnd}
        role="button"
        tabIndex={0}
        aria-label={`Open ${product.name} image gallery`}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') openLightbox();
        }}
      >
        {galleryImages.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src + i}
            src={src}
            alt={i === 0 ? `${product.name} — ${color.name}` : ''}
            className={`pd-slide ${activeIdx === i ? 'on' : ''}`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
        {galleryImages.length > 1 && (
          <div className="pd-dots" onClick={(event) => event.stopPropagation()}>
            {galleryImages.map((_, i) => (
              <button
                key={i}
                type="button"
                className={activeIdx === i ? 'on' : ''}
                onClick={() => showImage(i)}
                aria-label={`Show image ${i + 1}`}
                aria-pressed={activeIdx === i}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pd-info">
        <span className="eyebrow">{product.subtitle}</span>
        <h1>{product.name}</h1>
        <div className="price">€{product.price.toFixed(0)}</div>
        <p className="desc">{product.description}</p>

        <div className="pd-row">
          <span className="lab">Color · {color.name}</span>
          <div className="swatches">
            {colors.map((c) => (
              <button
                key={c.slug}
                className={`sw ${c.slug === color.slug ? 'on' : ''}`}
                style={{ background: c.hex }}
                aria-label={c.name}
                aria-pressed={c.slug === color.slug}
                onClick={() => setColor(c)}
                type="button"
              />
            ))}
          </div>
        </div>

        <div className="pd-row">
          <span className="lab">Size</span>
          <div className="sizes">
            {product.sizes.map((s) => {
              const sStock = stockTracked ? stockBySize[s] ?? 0 : Infinity;
              const sOut = stockTracked && sStock <= 0;
              return (
                <button
                  key={s}
                  className={`sz ${size === s ? 'on' : ''} ${sOut ? 'out' : ''}`}
                  onClick={() => setSize(s)}
                  type="button"
                  aria-label={sOut ? `${s} — sold out` : s}
                  disabled={sOut}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {isLowStock && (
            <p className="pd-stock pd-stock--low">
              Only {stockForSelected} left in size {size}.
            </p>
          )}
          {isOutOfStock && (
            <p className="pd-stock pd-stock--out">Size {size} is currently sold out.</p>
          )}
        </div>

        <div className="pd-actions">
          <button
            className="btn btn-dark"
            onClick={onAdd}
            type="button"
            disabled={isOutOfStock}
          >
            {isOutOfStock ? 'Sold Out' : 'Add to Bag'} <span className="ar">→</span>
          </button>
        </div>

        <div className="pd-feat">
          <div>
            <strong>Made in</strong>
            Mediterranean atelier — small-batch
          </div>
          <div>
            <strong>Fabric</strong>
            Premium recycled-blend, soft-touch
          </div>
          <div>
            <strong>Care</strong>
            Hand wash cold, lay flat to dry
          </div>
          <div>
            <strong>Shipping</strong>
            Complimentary worldwide
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="pd-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image viewer`}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="pd-lightbox-close"
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image viewer"
          >
            ×
          </button>

          {galleryImages.length > 1 && (
            <button
              className="pd-lightbox-nav pd-lightbox-prev"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showPreviousLightbox();
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}

          <div
            className="pd-lightbox-stage"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleLightboxTouchStart}
            onTouchEnd={handleLightboxTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galleryImages[lightboxIdx]}
              alt={`${product.name} — ${color.name} image ${lightboxIdx + 1}`}
            />
          </div>

          {galleryImages.length > 1 && (
            <button
              className="pd-lightbox-nav pd-lightbox-next"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showNextLightbox();
              }}
              aria-label="Next image"
            >
              ›
            </button>
          )}

          <div className="pd-lightbox-count">
            {lightboxIdx + 1} / {galleryImages.length}
          </div>
        </div>
      )}
    </>
  );
}
