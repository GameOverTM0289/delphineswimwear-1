import Link from 'next/link';

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-tl">
        N° 26 <span className="diamond"></span> Volume One
      </div>
      <div className="hero-tr">
        Mediterranean
        <small>Spring · Summer Collection</small>
      </div>
      <div className="hero-body">
        <div>
          <p className="hero-pre">
            <span className="line"></span>Mediterranean Summer &rsquo;26
          </p>
          <h1 className="hero-h">
            Rhythm of a
            <br />
            <em>Free Spirit</em>
          </h1>
          <div className="hero-btns">
            <Link href="/shop" className="btn btn-hero-primary">
              Shop the Collection <span className="ar">→</span>
            </Link>
            <Link href="/lookbook" className="btn btn-hero-secondary">
              View Lookbook <span className="ar">→</span>
            </Link>
          </div>
        </div>
        <div className="hero-meta">
          <p>
            Born in the Mediterranean — swimwear crafted for women who move freely and dress with{' '}
            <span className="em">intention</span>.
          </p>
          <div className="stamp">
            <span>Eleganza</span>
            <span>Comfort</span>
            <span>Freedom</span>
          </div>
        </div>
      </div>
      <div className="cue">
        <span>Scroll</span>
        <span className="ln"></span>
      </div>
    </section>
  );
}
