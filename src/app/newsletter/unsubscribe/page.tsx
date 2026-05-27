'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('err');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/newsletter/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        setStatus(res.ok ? 'ok' : 'err');
      } catch {
        setStatus('err');
      }
    })();
  }, [token]);

  return (
    <section className="newsletter-page">
      <h1>
        {status === 'loading' && <>One moment…</>}
        {status === 'ok' && (
          <>
            You&rsquo;ve been <em>unsubscribed</em>.
          </>
        )}
        {status === 'err' && <>Unsubscribe failed</>}
      </h1>
      {status === 'ok' && (
        <>
          <p>
            We&rsquo;re sorry to see you go. You won&rsquo;t receive any more newsletters from
            us. Transactional emails (order confirmations) will still be sent.
          </p>
          <Link href="/" className="btn btn-outline">
            Back to home <span className="ar">→</span>
          </Link>
        </>
      )}
      {status === 'err' && (
        <>
          <p>The unsubscribe link is invalid or has already been used.</p>
          <Link href="/contact" className="btn btn-outline">
            Contact us <span className="ar">→</span>
          </Link>
        </>
      )}
    </section>
  );
}

export default function UnsubscribePage() {
  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <Suspense fallback={<section className="newsletter-page"><h1>Loading…</h1></section>}>
          <UnsubscribeInner />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
