'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // important: include credentials so the Set-Cookie header sticks
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error || `Login failed (HTTP ${res.status}).`);
        setSubmitting(false);
        return;
      }
      // Hard navigation so the new cookie is read by the server-rendered /admin page.
      window.location.href = '/admin';
    } catch (ex: any) {
      setErr(ex?.message || 'Could not log in. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>
          Admin <em>Sign In</em>
        </h1>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {err && <p className="err">{err}</p>}
        <button type="submit" className="btn btn-dark" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign In'} <span className="ar">→</span>
        </button>
      </form>
    </div>
  );
}
