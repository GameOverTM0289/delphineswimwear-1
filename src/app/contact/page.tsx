'use client';

import { useState } from 'react';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — humans never see/fill
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('err');
        setErrMsg(
          data?.error === 'DATABASE_NOT_CONFIGURED'
            ? 'Our contact form isn\u2019t connected yet. Please email us directly at contact@delphineswimwear.com.'
            : data?.error === 'RATE_LIMIT'
            ? 'Too many messages from this address. Please try again in an hour.'
            : data?.error === 'VALIDATION'
            ? 'Please check the form — some fields look incomplete.'
            : 'Could not send your message. Please try again.',
        );
        return;
      }
      setStatus('ok');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setStatus('err');
      setErrMsg('Could not send your message. Please try again.');
    }
  };

  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <section className="contact-page">
          {/* Left — editorial feature column */}
          <aside className="contact-feature">
            <div
              className="contact-feature-img"
              style={{ backgroundImage: "url('/assets/collections/mission-beach.jpg')" }}
              aria-hidden="true"
            />
            <div className="contact-feature-body">
              <span className="eyebrow">
                Get in touch <span className="dot"></span> Always listening
              </span>
              <h1>
                We&rsquo;d love to <em>hear from you</em>
              </h1>
              <p>
                Whether you&rsquo;d like to know more about a piece, our atelier, or a private
                appointment — write to us. We read every message and reply within two business
                days.
              </p>

              <dl className="contact-meta">
                <div>
                  <dt>Email</dt>
                  <dd>contact@delphineswimwear.com</dd>
                </div>
                <div>
                  <dt>Atelier</dt>
                  <dd>Mediterranean coast — by appointment</dd>
                </div>
                <div>
                  <dt>Hours</dt>
                  <dd>Mon – Fri · 09:00 – 18:00 CET</dd>
                </div>
              </dl>
            </div>
          </aside>

          {/* Right — form */}
          <div className="contact-panel">
            <div className="contact-panel-inner">
              <span className="eyebrow">Send a message</span>
              <h2>
                Write to <em>us</em>
              </h2>

              <form className="contact-form" onSubmit={onSubmit}>
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
                <div className="row2">
                  <div>
                    <span className="lab">Name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={80}
                    />
                  </div>
                  <div>
                    <span className="lab">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={160}
                    />
                  </div>
                </div>
                <div>
                  <span className="lab">Subject (optional)</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div>
                  <span className="lab">Message</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    minLength={10}
                    maxLength={5000}
                    rows={6}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-dark"
                  disabled={status === 'sending'}
                >
                  {status === 'sending' ? 'Sending…' : 'Send Message'}{' '}
                  <span className="ar">→</span>
                </button>
                {status === 'ok' && (
                  <p className="contact-msg ok">
                    Thank you — your message is on its way. We&rsquo;ll be in touch soon.
                  </p>
                )}
                {status === 'err' && <p className="contact-msg err">{errMsg}</p>}
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
