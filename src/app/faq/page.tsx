import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import CartDrawer from '@/components/cart/CartDrawer';

export const metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers to common questions about Delphine swimwear — sizing, shipping, returns, fabric care, and more.',
};

const faqs = [
  {
    q: 'How do I find my size?',
    a: 'Our pieces are designed to fit a Mediterranean silhouette — true to size, with a soft second-skin feel. Each product page lists S, M, and L. If you are between sizes, we recommend sizing up for one-pieces and staying true to size for bikinis.',
  },
  {
    q: 'Where is Delphine made?',
    a: 'Every Delphine piece is conceived and made in our atelier on the Mediterranean coast, in small batches by a team of four. Each garment is hand-finished and quality-checked before it ships.',
  },
  {
    q: 'How should I care for my swimwear?',
    a: 'Hand-wash in cold fresh water after every wear. Avoid wringing — gently press out water and lay flat in the shade to dry. Keep away from chlorine, sunscreen residue, and rough surfaces. Treated this way, a Delphine piece will last seasons.',
  },
  {
    q: 'What is your shipping timeline?',
    a: 'Orders are dispatched within two business days. Standard shipping takes 4–7 business days within Europe, 7–14 worldwide. Tracking is provided. See our Shipping page for full details.',
  },
  {
    q: 'Can I return or exchange a piece?',
    a: 'Yes — within 14 days of receipt, in unworn condition with original hygiene liner intact. See our Returns page for the full process.',
  },
  {
    q: 'Do you offer gift cards?',
    a: 'Digital gift cards are coming soon. In the meantime, we are happy to arrange a personal gift order — please email contact@delphineswimwear.com.',
  },
  {
    q: 'Will you restock a sold-out piece?',
    a: 'Most pieces are produced in a single run for the season. If a piece is sold out, it may return in a future capsule — but we cannot guarantee it. Subscribe via our Contact page to be notified.',
  },
  {
    q: 'How can I get in touch?',
    a: 'Email contact@delphineswimwear.com or use the form on our Contact page. We read every message and respond within two business days.',
  },
];

export default function FAQPage() {
  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <PageHero
          eyebrow="Help"
          title={<>Frequently <em>Asked</em></>}
          description="Answers to the questions we hear most. Can’t find what you need? Reach out — we’re always listening."
        />
        <div className="info-wrap">
          {faqs.map((f, i) => (
            <div className="faq-item" key={i}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
          <p style={{ marginTop: 48, color: 'var(--m)' }}>
            Still have a question? <Link href="/contact">Get in touch</Link>.
          </p>
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
