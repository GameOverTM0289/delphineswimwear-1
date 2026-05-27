import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/lib/types';

interface Props {
  products: Product[];
}

export default function BestSellers({ products }: Props) {
  return (
    <section className="best">
      <Reveal>
        <div className="best-head">
          <h2>
            Best <em>Sellers</em>
          </h2>
          <Link href="/shop" className="lnk">
            View All <span className="ar">→</span>
          </Link>
        </div>
      </Reveal>
      <div className="pgrid">
        {products.map((p) => (
          <Reveal key={p.id}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
