'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { GA_ID } from '@/lib/analytics';

const STORAGE_KEY = 'delphine_cookie_consent';
type Consent = 'accepted' | 'declined';

/**
 * Privacy-first cookie consent.
 *
 * Google Analytics is the only cookie-setting tracker on the site, so it is
 * loaded ONLY after the visitor explicitly accepts. (Vercel Web Analytics is
 * cookieless and stays in the root layout — it needs no consent.) The choice
 * is remembered in localStorage; the banner never shows again once answered,
 * and never shows at all if no GA id is configured.
 */
export default function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'accepted' || saved === 'declined') setConsent(saved);
    } catch {
      /* localStorage blocked — treat as undecided, banner will show */
    }
    setReady(true);
  }, []);

  function choose(value: Consent) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore persistence failures */
    }
    setConsent(value);
  }

  const hasGA = Boolean(GA_ID);
  const loadGA = hasGA && consent === 'accepted';
  const showBanner = ready && hasGA && consent === null;

  return (
    <>
      {loadGA && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true, send_page_view: true });`}
          </Script>
        </>
      )}

      {showBanner && (
        <div
          className="cookie-consent"
          role="dialog"
          aria-live="polite"
          aria-label="Cookie preferences"
        >
          <div className="cookie-consent-inner">
            <p className="cookie-consent-text">
              We use a few cookies to understand how the collection is explored and to
              refine your experience. Read our{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
            <div className="cookie-consent-actions">
              <button
                type="button"
                className="cc-btn cc-decline"
                onClick={() => choose('declined')}
              >
                Decline
              </button>
              <button
                type="button"
                className="cc-btn cc-accept"
                onClick={() => choose('accepted')}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
