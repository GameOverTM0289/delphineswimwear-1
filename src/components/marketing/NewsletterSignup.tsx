'use client';

import { useState } from 'react';

interface Props {
  source?: 'footer' | 'popup' | 'checkout';
  variant?: 'inline' | 'stacked';
  title?: string;
  subtitle?: string;
}

export default function NewsletterSignup({
  source = 'footer',
  variant = 'inline',
  title = 'Letters from Delphine',
  subtitle = 'Collection previews and atelier notes — a few times a year, no more.',
}: Props) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<'idle' | 'loading' | 'pending' | 'active' | 'err'>(
    'idle',
  );
  const [errMsg, setErrMsg] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setErrMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('err');
        setErrMsg(
          data?.error === 'RATE_LIMIT'
            ? 'Too many requests. Please try again in a little while.'
            : data?.error === 'DATABASE_NOT_CONFIGURED'
            ? "Sign-ups aren't connected yet. Try again soon."
            : 'Something went wrong. Please try again.',
        );
        return;
      }
      setStatus(data.status === 'active' ? 'active' : 'pending');
      setEmail('');
    } catch {
      setStatus('err');
      setErrMsg('Network error. Please try again.');
    }
  };

  return (
    <div className={`newsletter newsletter--${variant}`}>
      <div className="newsletter-copy">
        <h4>{title}</h4>
        <p>{subtitle}</p>
      </div>
      <form className="newsletter-form" onSubmit={onSubmit}>
        {/* Honeypot — invisible to humans, filled by bots. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
        />
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading' || status === 'pending' || status === 'active'}
        />
        <button
          type="submit"
          className="btn btn-dark"
          disabled={status === 'loading' || status === 'pending' || status === 'active'}
        >
          {status === 'loading' ? 'Sending…' : 'Subscribe'} <span className="ar">→</span>
        </button>
      </form>
      {status === 'pending' && (
        <p className="newsletter-msg ok">
          Check your inbox — we&rsquo;ve sent a confirmation link.
        </p>
      )}
      {status === 'active' && (
        <p className="newsletter-msg ok">You&rsquo;re already on our list. Thank you.</p>
      )}
      {status === 'err' && <p className="newsletter-msg err">{errMsg}</p>}
    </div>
  );
}
