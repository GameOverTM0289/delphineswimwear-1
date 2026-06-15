import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import CartDrawer from '@/components/cart/CartDrawer';

export const metadata = {
  title: 'Privacy Policy',
  description:
    'How Delphine collects, uses, and protects your personal data — written in plain English.',
};

export default function PrivacyPage() {
  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <PageHero
          eyebrow="Legal"
          title={<>Privacy <em>Policy</em></>}
          description="Plainly written. Your data, what we do with it, and the rights you have over it."
        />
        <div className="info-wrap">
          <span className="updated">Last updated · April 2026</span>

          <h2>What we <em>collect</em></h2>
          <p>
            When you place an order, we collect your name, email address, phone number, shipping
            address, and payment confirmation from our payment provider. We never see or store your
            card number.
          </p>
          <p>
            When you contact us, we keep the message and your email so we can reply. When you
            subscribe to our newsletter, we keep your email until you unsubscribe.
          </p>
          <p>
            We use a small amount of website analytics (page views, referrer, country) to
            understand which pages people read. This is aggregated and does not identify you.
          </p>

          <h2>How we <em>use it</em></h2>
          <ul>
            <li>To process and ship your order.</li>
            <li>To answer your questions when you write to us.</li>
            <li>To send you the newsletter, only if you have asked for it.</li>
            <li>To meet our legal obligations (tax, fraud prevention, accounting).</li>
          </ul>
          <p>
            We do not sell your data, and we do not share it with anyone outside the partners we
            need to fulfil your order — our shipping carrier, our payment processor, and our email
            provider. Each is bound by their own privacy obligations.
          </p>

          <h2>How long we <em>keep it</em></h2>
          <p>
            Order data is retained for 7 years to meet accounting requirements. Contact-form
            messages are kept for 2 years. Newsletter subscriptions are kept until you unsubscribe.
          </p>

          <h2>Your <em>rights</em></h2>
          <p>
            You can ask us at any time to access, correct, delete, or export your personal data.
            Email <Link href="/contact">contact@delphineswimwear.com</Link> and we will respond within 30
            days. You also have the right to lodge a complaint with your national data protection
            authority.
          </p>

          <h2>Cookies</h2>
          <p>
            We use a small number of strictly-necessary cookies — for example, to keep your bag
            full as you browse, and to keep you signed in if you’re an admin. We don’t use
            advertising or tracking cookies.
          </p>

          <h2>Changes to this <em>policy</em></h2>
          <p>
            If we make material changes, we will post a notice at the top of this page and update
            the date above. Continued use of the site after a change indicates acceptance.
          </p>

          <h2>Get in <em>touch</em></h2>
          <p>
            For any privacy question, write to{' '}
            <Link href="/contact">contact@delphineswimwear.com</Link>.
          </p>
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
