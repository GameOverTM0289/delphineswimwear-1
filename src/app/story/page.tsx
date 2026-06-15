import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import Reveal from '@/components/ui/Reveal';

export const metadata = {
  title: 'Our Story',
  description:
    'The story of Delphine — refined swimwear born in the Mediterranean, made with intention and quiet craftsmanship.',
};

export default function StoryPage() {
  return (
    <>
      <Announcement />
      <Nav />
      <main>
        {/* ─── Editorial hero ─── */}
        <section
          className="story-hero"
          style={{ backgroundImage: "url('/assets/editorial/editorial-2.jpg')" }}
        >
          <div className="story-hero-ov" aria-hidden="true" />
          <div className="story-hero-body">
            <span className="eyebrow">
              Our Story <span className="dot"></span> Volume One
            </span>
            <h1>
              Born in the
              <br />
              <em>Mediterranean</em>
            </h1>
            <p>A label rooted in light, salt, and the quiet rhythm of the coast.</p>
          </div>
          <div className="story-hero-meta">
            <span>Atelier · Mediterranean Coast</span>
            <span>Established · Volume One</span>
          </div>
        </section>

        {/* ─── Chapter I — Intro with dropped cap ─── */}
        <section className="story-section">
          <Reveal>
            <div className="story-chapter">
              <span className="chapter-mark">Chapter I</span>
              <h2>
                A label of
                <br />
                <em>quiet intention</em>
              </h2>
            </div>
          </Reveal>

          <Reveal>
            <div className="story-lead">
              <p className="lead-para">
                <span className="dropcap">D</span>elphine began as a small studio along the
                Mediterranean coast — a place where women have always dressed with a particular
                kind of ease. We took that language — the way light falls on linen, the way salt
                softens skin — and translated it into swimwear.
              </p>
              <p>
                Each piece is conceived in a small atelier, made in small batches, and finished
                by hand. We choose every fabric for how it feels against the skin and every
                silhouette for how it moves. Nothing is rushed. Nothing is loud.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ─── Chapter II — Atelier (image + text) ─── */}
        <section className="story-feature">
          <Reveal>
            <div className="story-feature-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/collections/mission.jpg"
                alt="Inside the Delphine atelier"
              />
              <span className="story-feature-cap">
                Inside the atelier <span className="diamond"></span> Mediterranean coast
              </span>
            </div>
          </Reveal>
          <Reveal>
            <div className="story-feature-body">
              <span className="chapter-mark">Chapter II</span>
              <h3>
                Made by <em>hand</em>,<br />
                made to <em>last</em>.
              </h3>
              <p>
                Our atelier is small by design. A team of four. Four sewing machines. A long
                wooden table where every piece is laid out, inspected, and finished before it
                ships. We choose this scale because it&rsquo;s the only scale at which we can
                guarantee the standard we want to put our name on.
              </p>
              <p>
                We don&rsquo;t buy fabric by the kilometre. We choose each batch — the
                soft-touch recycled blend that holds its colour after a hundred swims, the
                gold-toned star clasp pressed by a maker we&rsquo;ve worked with for years —
                because we know what we want it to feel like in your hand.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ─── Pull quote ─── */}
        <Reveal>
          <section className="story-pullquote">
            <span className="quote-mark">&ldquo;</span>
            <blockquote>
              A garment is only as good as the way it is worn —
              <br />
              and the way it is made.
            </blockquote>
            <span className="quote-attr">Delphine, Volume One</span>
          </section>
        </Reveal>

        {/* ─── Chapter III — Values triptych ─── */}
        <section className="story-values">
          <Reveal>
            <div className="story-chapter story-chapter--center">
              <span className="chapter-mark">Chapter III</span>
              <h2>
                Three pillars,
                <br />
                one <em>vision</em>.
              </h2>
              <p className="story-chapter-lead">
                Every choice we make — from a fabric weave to the way a strap sits — is guided
                by the same set of values.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="values-grid">
              <article className="value">
                <span className="value-num">01</span>
                <div className="value-rule" />
                <h4>
                  <em>Eleganza</em>
                </h4>
                <p>
                  Refined silhouettes drawn from the Mediterranean&rsquo;s timeless aesthetic —
                  understated, elevated, always intentional. Made to feel as effortless as the
                  woman who wears it.
                </p>
              </article>
              <article className="value">
                <span className="value-num">02</span>
                <div className="value-rule" />
                <h4>Comfort</h4>
                <p>
                  Fabrics selected for how they feel against the skin. Cut for freedom of
                  movement. Made to be lived in, all day long — from morning swim to evening
                  dinner by the water.
                </p>
              </article>
              <article className="value">
                <span className="value-num">03</span>
                <div className="value-rule" />
                <h4>
                  <em>Freedom</em>
                </h4>
                <p>
                  Swimwear that moves with you — designed to accompany women with confidence at
                  every moment by the sea. Quiet, considered, and always ready for the next
                  wave.
                </p>
              </article>
            </div>
          </Reveal>
        </section>

        {/* ─── Process timeline ─── */}
        <section className="story-process">
          <Reveal>
            <div className="story-chapter">
              <span className="chapter-mark">The Process</span>
              <h2>
                From thread
                <br />
                to <em>shoreline</em>.
              </h2>
            </div>
          </Reveal>

          <Reveal>
            <ol className="process-list">
              <li>
                <span className="process-num">01</span>
                <h5>Material</h5>
                <p>
                  We source soft-touch recycled fabrics in small batches. Every roll is hand
                  inspected for hand, drape, and colour-fastness.
                </p>
              </li>
              <li>
                <span className="process-num">02</span>
                <h5>Pattern</h5>
                <p>
                  Each silhouette begins as a paper pattern, drafted on the table and revised
                  through fittings on real bodies — never on a mannequin alone.
                </p>
              </li>
              <li>
                <span className="process-num">03</span>
                <h5>Cut &amp; sew</h5>
                <p>
                  Cut by hand in our atelier. Sewn slowly. Trimmed only when the seams sit the
                  way they were meant to.
                </p>
              </li>
              <li>
                <span className="process-num">04</span>
                <h5>Finish</h5>
                <p>
                  Each piece is hand-finished — the gold star clasp pressed in, the hidden
                  liner stitched, the label set straight — before it ships in our linen pouch.
                </p>
              </li>
            </ol>
          </Reveal>
        </section>

        {/* ─── Closing CTA ─── */}
        <Reveal>
          <section className="story-closing">
            <span className="eyebrow">Continue the story</span>
            <h2>
              Every piece a <em>chapter</em>.
            </h2>
            <p>
              The Mediterranean Summer &rsquo;26 collection is the second volume in an ongoing
              edit. Each release is small. Each piece, intentional.
            </p>
            <Link href="/shop" className="btn btn-dark">
              Shop the Collection <span className="ar">→</span>
            </Link>
          </section>
        </Reveal>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
