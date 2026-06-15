'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface Props {
  product: Product;
}

// Tiny inline placeholder shown when a product image fails to load.
// Avoids the alt-text-only state and gives broken rows a graceful fallback.
const PLACEHOLDER_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="#F2ECE1"/>
      <text x="150" y="200" font-family="Georgia, serif" font-style="italic"
            font-size="18" fill="#7C766D" text-anchor="middle">Delphine</text>
    </svg>`,
  );

export default function ProductCard({ product }: Props) {
  const [mainSrc, setMainSrc] = useState(product.mainImage);
  const [altSrc, setAltSrc] = useState(product.altImage);

  return (
    <Link className={`pcard pcard--${product.slug}`} href={`/product/${product.slug}`}>
      <div className="pimg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="main"
          src={mainSrc}
          alt={product.name}
          onError={() => setMainSrc(PLACEHOLDER_SVG)}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="alt"
          src={altSrc}
          alt=""
          onError={() => setAltSrc(PLACEHOLDER_SVG)}
        />
        {product.badge && <span className="pbadge">{product.badge}</span>}
      </div>
      <div className="meta">
        <span className="name">{product.name}</span>
        <span className="price">{formatPrice(product.price, product.currency)}</span>
      </div>
      <p className="sub">{product.subtitle}</p>
    </Link>
  );
}
