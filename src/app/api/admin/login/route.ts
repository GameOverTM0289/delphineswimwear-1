import { NextResponse } from 'next/server';
import {
  attachAdminCookie,
  detachAdminCookie,
  verifyAdminPassword,
  getAdminEmail,
  isAdminConfigured,
} from '@/lib/auth';
import { loginLimiter, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ct = req.headers.get('content-type') ?? '';

  // Logout via classic form post (from the admin sidebar logout button)
  if (
    ct.includes('application/x-www-form-urlencoded') ||
    ct.includes('multipart/form-data')
  ) {
    const form = await req.formData();
    if (form.get('action') === 'logout') {
      const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
      detachAdminCookie(res);
      return res;
    }
    return NextResponse.json({ error: 'Unsupported form action' }, { status: 400 });
  }

  // Rate limit by IP — 5 attempts per 15 minutes.
  const ip = getClientIp(req);
  const limit = await loginLimiter.limit(ip);
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          'Admin credentials are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD), then restart the server.',
      },
      { status: 503 },
    );
  }

  const expectedEmail = (getAdminEmail() ?? '').trim().toLowerCase();
  const emailOk = expectedEmail === email;
  const passwordOk = await verifyAdminPassword(password);

  if (!emailOk || !passwordOk) {
    await new Promise((r) => setTimeout(r, 350));
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  attachAdminCookie(res, email);
  return res;
}
