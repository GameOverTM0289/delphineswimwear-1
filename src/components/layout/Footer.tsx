import Link from 'next/link';
import NewsletterSignup from '@/components/marketing/NewsletterSignup';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-newsletter">
        <NewsletterSignup
          source="footer"
          variant="inline"
          title="Letters from Delphine"
          subtitle="Collection previews and atelier notes — a few times a year, no more."
        />
      </div>

      <div className="fg">
        <div className="f-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/delphine-logo.png" alt="Delphine" />
          <p>Refined swimwear rooted in Mediterranean light, salt, and spirit.</p>
          <div className="stamp">Born in the Mediterranean</div>
        </div>
        <div className="f-col">
          <h4>Shop</h4>
          <ul>
            <li><Link href="/shop?cat=one-pieces">One Pieces</Link></li>
            <li><Link href="/shop?cat=bikinis">Bikinis</Link></li>
            <li><Link href="/shop">Collection</Link></li>
            <li><Link href="/lookbook">Lookbook</Link></li>
          </ul>
        </div>
        <div className="f-col">
          <h4>Help</h4>
          <ul>
            <li><Link href="/faq">FAQs</Link></li>
            <li><Link href="/shipping">Shipping</Link></li>
            <li><Link href="/returns">Returns</Link></li>
            <li><Link href="/contact">Email Us</Link></li>
          </ul>
        </div>
        <div className="f-col">
          <h4>About</h4>
          <ul>
            <li><Link href="/story">Our Story</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li>
              <a href="https://instagram.com/delphineswimwear" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="fb">
        <p>© Delphine Swimwear. All rights reserved.</p>
        <p><em>Born in the Mediterranean.</em></p>
      </div>
    </footer>
  );
}
