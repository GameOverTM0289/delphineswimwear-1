'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

function ConfirmInner() {
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
        const res = await fetch('/api/newsletter/confirm', {
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
        {status === 'loading' && <>Confirming…</>}
        {status === 'ok' && (
          <>
            You&rsquo;re <em>in</em>.
          </>
        )}
        {status === 'err' && <>Confirmation failed</>}
      </h1>
      {status === 'ok' && (
        <>
          <p>
            Your subscription is confirmed. We&rsquo;ll send the next letter when there&rsquo;s
            something worth saying.
          </p>
          <Link href="/shop" className="btn btn-dark">
            Shop the collection <span className="ar">→</span>
          </Link>
        </>
      )}
      {status === 'err' && (
        <>
          <p>
            The confirmation link may have expired or already been used. Try subscribing again
            from the footer.
          </p>
          <Link href="/" className="btn btn-outline">
            Back to home <span className="ar">→</span>
          </Link>
        </>
      )}
    </section>
  );
}

export default function ConfirmPage() {
  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <Suspense fallback={<section className="newsletter-page"><h1>Loading…</h1></section>}>
          <ConfirmInner />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
