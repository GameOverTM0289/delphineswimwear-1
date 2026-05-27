import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import CartDrawer from '@/components/cart/CartDrawer';

export const metadata = {
  title: 'Shipping',
  description:
    'Delphine swimwear shipping rates, transit times, and delivery information.',
};

export default function ShippingPage() {
  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <PageHero
          eyebrow="Shipping"
          title={<>Worldwide, <em>complimentary</em></>}
          description="Every Delphine order ships from our Mediterranean atelier — carefully wrapped, quietly packaged, fully tracked."
        />
        <div className="info-wrap">
          <h2>Rates &amp; <em>timing</em></h2>
          <p>
            We offer complimentary standard shipping on all orders, worldwide. Express options are
            available at checkout for faster delivery.
          </p>

          <h3>Europe</h3>
          <ul>
            <li>Standard — 4 to 7 business days · complimentary</li>
            <li>Express — 1 to 3 business days · €15</li>
          </ul>

          <h3>North America</h3>
          <ul>
            <li>Standard — 7 to 12 business days · complimentary</li>
            <li>Express — 3 to 5 business days · €25</li>
          </ul>

          <h3>Rest of world</h3>
          <ul>
            <li>Standard — 7 to 14 business days · complimentary</li>
            <li>Express — 4 to 7 business days · €30</li>
          </ul>

          <h2>Order <em>processing</em></h2>
          <p>
            Orders placed before 14:00 CET on a business day are dispatched the same day.
            Otherwise, your order leaves the atelier within two business days. You will receive a
            tracking link by email as soon as it ships.
          </p>

          <h2>Customs &amp; <em>duties</em></h2>
          <p>
            For destinations outside the European Union, customs duties and import taxes may apply.
            These are determined by your country’s customs office and are the responsibility of the
            recipient. We declare each parcel honestly and at full retail value.
          </p>

          <h2>Lost or delayed <em>parcels</em></h2>
          <p>
            If your tracking has not updated for more than 5 business days, please email{' '}
            <Link href="/contact">contact@delphineswimwear.com</Link> with your order number and we will open
            a trace with the carrier on your behalf.
          </p>

          <p style={{ marginTop: 48, color: 'var(--m)' }}>
            More questions? See the <Link href="/faq">FAQs</Link> or{' '}
            <Link href="/contact">contact us</Link>.
          </p>
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
