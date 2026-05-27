import Link from 'next/link';

export default function CollectionGrid() {
  return (
    <section className="coll-grid coll-grid--two" aria-label="Collections">
      <Link href="/shop?cat=one-pieces" className="coll-tile coll-tile--one-pieces">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/collections/one-pieces.jpg" alt="One Pieces" />
        <div className="coll-info">
          <h3>
            <em>One</em> Pieces
          </h3>
          <span className="lnk">
            Explore the edit <span className="ar">→</span>
          </span>
        </div>
      </Link>

      <Link href="/shop?cat=bikinis" className="coll-tile coll-tile--bikinis">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/collections/bikinis.jpg" alt="Bikinis" />
        <div className="coll-info">
          <h3>Bikinis</h3>
          <span className="lnk">
            Explore the edit <span className="ar">→</span>
          </span>
        </div>
      </Link>
    </section>
  );
}
