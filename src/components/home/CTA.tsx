import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';

export default function CTA() {
  return (
    <section className="cta">
      <div className="cta-bg"></div>
      <div className="cta-ov"></div>
      <Reveal>
        <div className="cta-body">
          <h2>
            Where <em>the sea</em>
            <br />
            meets <em>style</em>
          </h2>
          <p>
            Explore the full Mediterranean Summer &rsquo;26 collection — designed for women who live
            freely.
          </p>
          <Link href="/shop" className="btn btn-light">
            Shop the Full Collection <span className="ar">→</span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
