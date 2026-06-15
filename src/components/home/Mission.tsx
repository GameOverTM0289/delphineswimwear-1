import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';

export default function Mission() {
  return (
    <section className="mission">
      <Reveal>
        <div className="mission-txt">
          <span className="eyebrow">Our Mission</span>
          <h2 className="mission-h">
            Crafted for the
            <br />
            <em>Spirit of the Sea</em>
          </h2>
          <p className="mission-p">
            We create garments that combine quality and comfort with a sense of freedom —
            designed to enhance natural beauty and accompany women with quiet confidence at
            every moment by the sea.
          </p>
          <Link href="/story" className="btn btn-outline">
            Read More <span className="ar">→</span>
          </Link>
        </div>
      </Reveal>
      <Reveal>
        <div className="mission-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/collections/mission-beach.jpg" alt="Where the sea meets the sand" />
        </div>
      </Reveal>
    </section>
  );
}
