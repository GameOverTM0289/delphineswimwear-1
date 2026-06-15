import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';

export default function Origin() {
  return (
    <Reveal>
      <section className="origin">
        <span className="eyebrow">
          Quite Distinctively <span className="dot"></span> Our Origin
        </span>
        <h2>
          Born in the
          <br />
          <em>Mediterranean</em>
        </h2>
        <p>
          We translate the light, salt, and spirit of the Mediterranean coastline into garments that
          feel as effortless as the sea itself.
        </p>
        <Link href="/story" className="btn btn-outline">
          Our Story <span className="ar">→</span>
        </Link>
      </section>
    </Reveal>
  );
}
