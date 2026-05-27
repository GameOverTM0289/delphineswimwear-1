import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import CartDrawer from '@/components/cart/CartDrawer';

export const metadata = {
  title: 'Returns & Exchanges',
  description:
    'Delphine returns and exchanges policy — 14 days, original condition, simple process.',
};

export default function ReturnsPage() {
  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <PageHero
          eyebrow="Returns &amp; Exchanges"
          title={<>A <em>simple</em> return</>}
          description="If a piece isn’t right, we’ll make it right. Returns are accepted within 14 days of receipt."
        />
        <div className="info-wrap">
          <h2>The <em>policy</em></h2>
          <p>
            We accept returns and exchanges within 14 days of delivery, on any unworn item with the
            original hygiene liner intact and tags attached. Pieces showing signs of wear, makeup,
            sunscreen, or fragrance unfortunately cannot be accepted.
          </p>

          <h2>How to <em>return</em></h2>
          <ol style={{ paddingLeft: 22, marginBottom: 18 }}>
            <li style={{ color: 'var(--m)', marginBottom: 10 }}>
              Email <Link href="/contact">contact@delphineswimwear.com</Link> with your order number and the
              piece(s) you would like to return.
            </li>
            <li style={{ color: 'var(--m)', marginBottom: 10 }}>
              We will reply within one business day with a return label and instructions.
            </li>
            <li style={{ color: 'var(--m)', marginBottom: 10 }}>
              Package the piece in its original wrapping, attach the label, and drop it at any
              carrier point.
            </li>
            <li style={{ color: 'var(--m)' }}>
              We process refunds within 5 business days of receiving the parcel. The refund lands on
              your original payment method within 5–10 business days after that, depending on your
              bank.
            </li>
          </ol>

          <h2>Exchanges</h2>
          <p>
            Exchanges follow the same process. Tell us the size or piece you would like instead, and
            we will reserve it for you while your return is in transit.
          </p>

          <h2>Faulty or damaged <em>items</em></h2>
          <p>
            If a piece arrives faulty or damaged, please email us within 7 days of delivery with a
            photo. We will arrange a free replacement or a full refund — whichever you prefer.
          </p>

          <h2>Return shipping</h2>
          <p>
            Return shipping inside the European Union is complimentary. For other regions, return
            shipping is at the customer’s expense unless the piece is faulty.
          </p>

          <p style={{ marginTop: 48, color: 'var(--m)' }}>
            Other questions? See the <Link href="/faq">FAQs</Link> or{' '}
            <Link href="/contact">contact us</Link>.
          </p>
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
