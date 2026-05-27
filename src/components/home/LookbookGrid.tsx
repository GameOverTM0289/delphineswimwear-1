import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';

export default function LookbookGrid() {
  return (
    <section className="lookbook">
      <Reveal>
        <div className="lb-head">
          <h2>
            The <em>Lookbook</em>
          </h2>
          <p className="lb-tag">
            A visual journey through the
            <br />
            Mediterranean Summer &rsquo;26 collection.
          </p>
        </div>
      </Reveal>
      <Reveal>
        <div className="lb-grid">
          <Link href="/shop" className="lb-a" aria-label="Shop the collection">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/lookbook/lb-1.jpg" alt="Look 01" />
          </Link>
          <Link href="/shop" className="lb-b" aria-label="Shop the collection">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/products/product-3-yellow-front.webp" alt="Look 02" />
          </Link>
          <Link href="/shop" className="lb-c" aria-label="Shop the collection">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/products/product-4-red-front.webp" alt="Look 03" />
          </Link>
          <Link href="/shop" className="lb-d" aria-label="Shop the collection">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/lookbook/lb-2.jpg" alt="Look 04" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
