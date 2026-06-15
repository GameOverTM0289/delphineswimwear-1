import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';

export default function Philosophy() {
  return (
    <Reveal>
      <section className="philosophy">
        <div className="phil-left">
          <span className="eyebrow">Our Philosophy</span>
          <h2>
            Three pillars,
            <br />
            one <em>vision</em>.
          </h2>
          <p>
            Every piece we design is guided by a set of values that have defined Delphine since
            the beginning.
          </p>
          <Link
            href="/story"
            className="btn btn-light"
            style={{ borderColor: 'rgba(250,248,243,.5)' }}
          >
            Discover More <span className="ar">→</span>
          </Link>
        </div>
        <div className="phil-right">
          <div className="phil-item">
            <span className="phil-num">01</span>
            <div className="phil-txt">
              <h4><em>Eleganza</em></h4>
              <p>
                Refined silhouettes drawn from the Mediterranean&rsquo;s timeless aesthetic —
                understated, elevated, always intentional.
              </p>
            </div>
          </div>
          <div className="phil-item">
            <span className="phil-num">02</span>
            <div className="phil-txt">
              <h4>Comfort</h4>
              <p>
                Fabrics selected for how they feel against skin. Cut for freedom of movement.
                Made to be lived in, all day long.
              </p>
            </div>
          </div>
          <div className="phil-item">
            <span className="phil-num">03</span>
            <div className="phil-txt">
              <h4><em>Freedom</em></h4>
              <p>
                Swimwear that moves with you — designed to accompany women with confidence at
                every moment by the sea.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
