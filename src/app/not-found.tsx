import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

export default function NotFound() {
  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <div className="order-page">
          <h1>
            Page not <em>found</em>
          </h1>
          <p>The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.</p>
          <Link href="/" className="btn btn-dark">
            Return Home <span className="ar">→</span>
          </Link>
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
